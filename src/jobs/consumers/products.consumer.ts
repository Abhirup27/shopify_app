import { Processor, WorkerHost } from '@nestjs/bullmq';
import { JOB_TYPES, JobRegistry, QUEUES } from '../constants/jobs.constants';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from 'src/utils/utils.service';
import { Store } from 'src/database/entities/store.entity';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Job } from 'bullmq';
import { ShopifyRequestOptions } from 'src/types/ShopifyRequestOptions';
import { AxiosHeaders } from 'axios';
import { Product } from 'src/database/entities/product.entity';
import { ShopifyResponse } from 'src/types/ShopifyResponse';
import { Logger } from '@nestjs/common';
import { newProductDto } from 'src/web-app/dtos/new-product.dto';
import { StoreLocations } from 'src/database/entities/storeLocations.entity';
import { CacheProvider } from '../providers/cache-redis.provider';
import { ProductType } from 'src/database/entities/productType.entity';

export type ProductsType = {
  id: string;
  isRoot: boolean;
  isLeaf: boolean;
  childrenIds?: string[];
  parentId?: string;
  fullName: string;
  name: string;
  level: number;
};
type ProductTypesResponse = {
  data: {
    taxonomy: {
      categories: {
        nodes: ProductsType[];
      };
    };
  };
};

type ProductsQueueJobName =
  | typeof JOB_TYPES.SYNC_PRODUCTS
  | typeof JOB_TYPES.GET_PRODUCTS
  | typeof JOB_TYPES.CREATE_PRODUCT
  | typeof JOB_TYPES.GET_PRODUCT_TYPES
  | typeof JOB_TYPES.GET_PRODUCT_TYPES_DB
  | typeof JOB_TYPES.SYNC_PRODUCT_TYPES
  | typeof JOB_TYPES.CHECK_PRODUCT_TYPE;

// Create union type of Job objects for these jobs
type ProductsQueueJob = {
  [K in ProductsQueueJobName]: Job<JobRegistry[K]['data'], JobRegistry[K]['result']> & { name: K };
}[ProductsQueueJobName];

@Processor(QUEUES.PRODUCTS)
export class ProductsConsumer extends WorkerHost {
  private readonly logger = new Logger(ProductsConsumer.name);

  constructor(
    private readonly cacheService: CacheProvider,
    private readonly configService: ConfigService,
    private readonly utilsService: UtilsService,

    @InjectEntityManager()
    private entityManager: EntityManager,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(ProductType)
    private readonly productTypesRepository: Repository<ProductType>,
  ) {
    super();
  }
  public process = async (job: ProductsQueueJob): Promise<JobRegistry[ProductsQueueJobName]['result']> => {
    try {
      switch (job.name) {
        case JOB_TYPES.SYNC_PRODUCTS:
          return await this.syncProducts(job.data);
        case JOB_TYPES.GET_PRODUCTS:
          return await this.retrieveProducts(job.data);
        case JOB_TYPES.CREATE_PRODUCT:
          return await this.createProduct(job.data);
        case JOB_TYPES.GET_PRODUCT_TYPES:
          return await this.getProductTypes(job.data);
        case JOB_TYPES.GET_PRODUCT_TYPES_DB:
          return await this.getProductTypesFromDB();
        case JOB_TYPES.SYNC_PRODUCT_TYPES:
          return await this.syncProductTypes(job.data);
        case JOB_TYPES.CHECK_PRODUCT_TYPE:
          return await this.checkProductTypeByName(job.data);
        default:
          throw new Error('Invalid job name');
          break;
      }
    } catch (error) {
      this.logger.error(error.message);
    }
  };
  private isJobOfType<T extends keyof JobRegistry>(
    job: Job<JobRegistry[keyof JobRegistry]['data'], JobRegistry[keyof JobRegistry]['result']>,
    name: T,
  ): job is Job<JobRegistry[T]['data'], JobRegistry[T]['result']> {
    return job.name === name;
  }
  private syncProducts = async (
    data: JobRegistry[typeof JOB_TYPES.SYNC_PRODUCTS]['data'],
  ): Promise<JobRegistry[typeof JOB_TYPES.SYNC_PRODUCTS]['result']> => {
    try {
      // const store = store ?? null;

      let since_id: number = 0;
      const products = [];
      const requestOptions: ShopifyRequestOptions = { url: null, headers: null };
      requestOptions.headers = new AxiosHeaders()
        .set('Content-Type', 'application/json')
        .set('X-Shopify-Access-Token', data.store.access_token);

      requestOptions.url = await this.utilsService.getShopifyURLForStore(
        `products.json?since_id=${since_id}`,
        data.store,
      );
      const response: ShopifyResponse = await this.utilsService.requestToShopify('get', requestOptions);
      //console.log(response.respBody["products"]);
      response.statusCode == 200 ? products.push(...response.respBody['products']) : null;
      products.forEach(async product => {
        product.store_id = data.store.table_id;
        //console.log(store);
        await this.storeProductDB(product);
        since_id = product.id;
      });
    } catch (error) {
      this.logger.error(error.message);
    }
  };
  public storeProductDB = async (product: Product): Promise<Product | null> => {
    let productCreated: Product = undefined;
    try {
      const payload = {
        store_id: product.store_id,
        id: product.id,
        title: product.title,
        vendor: product.vendor,
        body_html: product.body_html,
        handle: product.handle,
        created_at: product.created_at,
        updated_at: product.updated_at,
        product_type: product.product_type,
        admin_graphql_api_id: product.admin_graphql_api_id,
        variants: product.variants,
        options: product.options,
        images: product.images,
        tags: product.tags,
      };
      productCreated = this.productsRepository.create(payload);
      productCreated = await this.productsRepository.save(payload);
    } catch (error) {
      this.logger.error(error);
      return null;
    }

    return productCreated;
  };

  private isStore = (data: unknown): data is Store => {
    return data instanceof Store || (typeof data === 'object' && data !== null && 'table_id' in data);
  };
  private retrieveProducts = async (
    data: JobRegistry[typeof JOB_TYPES.GET_PRODUCTS]['data'],
  ): Promise<JobRegistry[typeof JOB_TYPES.GET_PRODUCTS]['result']> => {
    const store = data.store;
    let products: Product[];
    try {
      //const store = job.data;
      products = await this.productsRepository.findBy({
        store_id: this.isStore(store) ? store.table_id : store,
      });
    } catch (error) {
      this.logger.error(error.message);
    }
    //console.log(await products[0].getAddToCartStatus())
    //return Promise.resolve(products);

    return Promise.resolve(
      products.map(entity => {
        //console.log(entity);
        const targetTag: string = this.configService.get<string>('AddToCartTagProduct') ?? 'buy-now';
        let status: boolean = false;
        let message: string = 'Remove Add to Cart';
        if (entity.tags.length > 0) {
          const tags: Array<string> = entity.tags.split(',');

          if (tags !== null && this.isArray(tags)) {
            if (tags.includes(targetTag)) {
              (status = true), (message = 'Enable Add to Cart');
            }
          }
        }

        return {
          ...entity,

          getAddToCartStatus: {
            status: status,
            message: message,
          },
        };
      }),
    );
  };
  private isArray(array: unknown): array is string[] {
    return Array.isArray(array) && array.every(item => typeof item === 'string');
  }

  private getProductTypes = async (
    data: JobRegistry[typeof JOB_TYPES.GET_PRODUCT_TYPES]['data'],
  ): Promise<JobRegistry[typeof JOB_TYPES.GET_PRODUCT_TYPES]['result']> => {
    const result = await this.cacheService.getMap('product-types');

    /* if(result == undefined || result == null ){
       result = 
 
     } */

    return result;
  };
  private getProductTypesFromDB = async (): Promise<ProductType[]> => {
    const result: ProductType[] = await this.productTypesRepository.find();

    return result;
  };
  private getChildrenPayload(id: string): { query: string } {
    const query = `{

      taxonomy{
          categories( first:250, childrenOf:"${id}") {
            nodes{
              id
              fullName
              name
              isRoot
              level
              isLeaf
              childrenIds
              parentId
              
              }
                pageInfo {
                hasNextPage
                endCursor
                hasPreviousPage
                startCursor
                }

          }
        }
    }`;

    return { query };
  }

  private getTaxonomyPayload(): { query: string } {
    const query = `{

      taxonomy{
          categories( first:250) {
            edges{
              node {

                fullName
                id
              }
            }
            nodes{
              id
              fullName
              name
              isRoot
              level
              isLeaf
              childrenIds
              parentId
            }
                pageInfo {
                hasNextPage
                endCursor
                hasPreviousPage
                startCursor
                }

          }
        }
    }`;

    return { query };
  }
  private getProductTypeUpdated = async (tableName: string = 'product_type'): Promise<Date | null> => {
    const result = await this.entityManager.query(`SELECT last_updated FROM table_metadata WHERE table_name = $1`, [
      tableName,
    ]);

    return result.length > 0 ? result[0].last_updated : null;
  };
  private syncProductTypes = async (
    data: JobRegistry[typeof JOB_TYPES.SYNC_PRODUCT_TYPES]['data'],
  ): Promise<JobRegistry[typeof JOB_TYPES.SYNC_PRODUCT_TYPES]['result']> => {
    try {
      //we check if the product categories has been synced in the last 30 minutes, if yes, don't sync again
      const lastUpdated = await this.getProductTypeUpdated();
      console.log(lastUpdated);
      const minutes = lastUpdated !== null ? new Date().getTime() - lastUpdated.getTime() : null;
      console.log(minutes);

      if (minutes != null) {
        if (minutes / (1000 * 60) < 30) {
          return;
        }
      }
      const options: ShopifyRequestOptions = {
        url: this.utilsService.getShopifyURLForStore('graphql.json', data.store),
        headers: this.utilsService.getGraphQLHeadersForStore(data.store),
      };
      options.data = this.getTaxonomyPayload();
      const response = await this.utilsService.requestToShopify<ProductTypesResponse>('post', options);

      let productTypes = response.respBody['data']['taxonomy']['categories']['nodes'];
      productTypes = this.productTypesRepository.create(productTypes);
      productTypes = await this.productTypesRepository.save(productTypes);

      const productMap: Map<string, string> = new Map<string, string>();

      for (const data of response.respBody['data']['taxonomy']['categories']['nodes']) {
        //        childrenIds.push(...data['childrenIds']);

        if (data['isLeaf'] == false) {
          options.data = this.getChildrenPayload(data['id']);
          const res = await this.utilsService.requestToShopify<ProductTypesResponse>('post', options);

          productTypes = res.respBody.data.taxonomy.categories.nodes;
          productTypes = this.productTypesRepository.create(productTypes);
          productTypes = await this.productTypesRepository.save(productTypes);
          //    console.log(res.respBody['data']['taxonomy']['categories']['nodes']);

          productMap.set(data.id, data.fullName);
          for (const data of res.respBody['data']['taxonomy']['categories']['nodes']) {
            productMap.set(data.id, data.fullName);
            if (data['isLeaf'] == false) {
              options.data = this.getChildrenPayload(data['id']);

              const res = await this.utilsService.requestToShopify<ProductTypesResponse>('post', options);

              productTypes = res.respBody.data.taxonomy.categories.nodes;
              console.log(res.respBody.data.taxonomy.categories.nodes);

              productTypes = this.productTypesRepository.create(productTypes);
              productTypes = await this.productTypesRepository.save(productTypes);

              for (const data of res.respBody.data.taxonomy.categories.nodes) {
                productMap.set(data.id, data.fullName);
              }
            }
          }
        }
      }
      //console.log(childrenIds);

      this.cacheService.storeMap('product-types', productMap);
      //return productTypes;
    } catch (error) {
      this.logger.error(error, this.syncProductTypes.name);
    }
  };

  private checkProductTypeByName = async (
    data: JobRegistry[typeof JOB_TYPES.CHECK_PRODUCT_TYPE]['data'],
  ): Promise<JobRegistry[typeof JOB_TYPES.CHECK_PRODUCT_TYPE]['result']> => {
    try {
      const result = await this.cacheService.mapFieldExists('product-types', data.name);
      if (result == false) {
        const resultDB = await this.productTypesRepository.existsBy({ fullName: data.name });
        if (resultDB == true) {
          return true;
        }
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error(error, this.checkProductTypeByName.name);
    }
  };

  private createProduct = async (
    data: JobRegistry[typeof JOB_TYPES.CREATE_PRODUCT]['data'],
  ): Promise<JobRegistry[typeof JOB_TYPES.CREATE_PRODUCT]['result']> => {
    const store: Store = data.store;
    const product: newProductDto = data.product;
    const locations: StoreLocations[] = [];
    try {
      const options: ShopifyRequestOptions = {
        url: this.utilsService.getShopifyURLForStore('graphql.json', store),
        headers: this.utilsService.getGraphQLHeadersForStore(store),
      };
      console.log(this.utilsService.checkIfStoreIsPrivate(store));
      options.data = await this.getCreateProductPayload(store, product, locations);
      const response = await this.utilsService.requestToShopify('post', options);

      console.log(response);
      console.log(response.respBody);
      console.log(response.respBody['data']['productCreate']);
    } catch (error) {
      this.logger.error(error, this.getCreateProductPayload.name);
    }

    return true;
  };
  private getCreateProductPayload = async (
    store: Store,
    product: newProductDto,
    location: StoreLocations[],
  ): Promise<{ query: string }> => {
    console.log(product.title, product.vendor, product.desc, JSON.stringify(product.tags));
    const productData = `(input: {category: "gid://shopify/TaxonomyCategory/me-1-3", title:"${product.title}",vendor:"${product.vendor}", descriptionHtml:"${product.desc}", tags:${JSON.stringify(product.tags)}})`;
    try {
      const query = `mutation {
      productCreate${productData} {
        product {
            id
            title
          options {
              id
              name
            optionValues {
                id
                name
                hasVariants
              }
            }
          }
        userErrors {
            field
            message
          }
        }
      } `;

      return { query };
    } catch (error) {
      this.logger.error(error, this.getCreateProductPayload.name);
      throw error; // Re-throw the error or return a default value
    }
  };
}
