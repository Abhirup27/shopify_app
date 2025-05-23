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
  | typeof JOB_TYPES.CACHE_PRODUCT_TYPES
  | typeof JOB_TYPES.CHECK_PRODUCT_TYPE;

// Create union type of Job objects for these jobs
type ProductsQueueJob = {
  [K in ProductsQueueJobName]: Job<JobRegistry[K]['data'], JobRegistry[K]['result']> & { name: K };
}[ProductsQueueJobName];

@Processor(QUEUES.PRODUCTS, { concurrency: 10 })
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
        case JOB_TYPES.CACHE_PRODUCT_TYPES:
          return await this.cacheProductTypes();
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
    if (data.id != null) {
      return await this.cacheService.getMap(data.id);
    }
    const result = await this.cacheService.getMap('product-types');

    return result;
  };
  private getProductTypesFromDB = async (): Promise<ProductType[]> => {
    const result: ProductType[] = await this.productTypesRepository.find();

    return result;
  };

  private getTaxonomyPayload(id?: string): { query: string } {
    const categoriesParams = id ? `categories(first: 250, childrenOf: "${id}")` : `categories(first: 250)`;

    const query = `{
    taxonomy {
      ${categoriesParams} {
        nodes {
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
  private async cacheProductTypes(parentId: string | null = '', cacheKey: string = 'product-types'): Promise<void> {
    try {
      // Stack to store work items: [parentId, cacheKey]
      const stack: Array<{
        parentId: string | null;
        cacheKey: string;
      }> = [];

      // Initialize stack with the starting parameters
      stack.push({ parentId, cacheKey });

      while (stack.length > 0) {
        const { parentId: currentParentId, cacheKey: currentCacheKey } = stack.pop();

        let children: ProductType[] = [];
        if ((currentParentId == '' || currentParentId == null) && currentCacheKey == 'product-types') {
          children = await this.productTypesRepository.findBy({ isRoot: true });
        } else {
          children = await this.productTypesRepository.findBy({ parentId: currentParentId });
        }
        if (!children.length) continue;

        const currentLevelMap = new Map<string, string>();

        for (const product of children) {
          currentLevelMap.set(product.id, product.name);

          // If this node has children (not a leaf), add it to the stack for processing
          if (product.isLeaf === false) {
            stack.push({
              parentId: product.id,
              cacheKey: product.id,
            });
          }
        }

        // Cache the map for the current level
        await this.cacheService.storeMap(currentCacheKey, currentLevelMap);
      }
    } catch (error) {
      this.logger.error(
        `Error syncing product level with parent ID ${parentId}: ${error}`,
        this.cacheProductTypes.name,
      );
    }
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
      // Check if the product categories have been synced in the last 30 minutes
      const lastUpdated = await this.getProductTypeUpdated();
      console.log(lastUpdated);
      const minutes = lastUpdated !== null ? new Date().getTime() - lastUpdated.getTime() : null;
      if (minutes != null && minutes / (1000 * 60) < 30) {
        // return;
      }

      const options: ShopifyRequestOptions = {
        url: this.utilsService.getShopifyURLForStore('graphql.json', data.store),
        headers: this.utilsService.getGraphQLHeadersForStore(data.store),
      };

      await this.syncProductLevel(null, 'product-types', options);
    } catch (error) {
      this.logger.error(error, this.syncProductTypes.name);
    }
  };

  private async syncProductLevel(
    parentId: string | null,
    cacheKey: string,
    options: ShopifyRequestOptions,
  ): Promise<void> {
    try {
      // Get sub product types for the parentId
      options.data = this.getTaxonomyPayload(parentId);
      const response = await this.utilsService.requestToShopify<ProductTypesResponse>('post', options);
      let productTypes = response.respBody?.data?.taxonomy?.categories?.nodes || [];

      if (!productTypes.length) return;

      productTypes = this.productTypesRepository.create(productTypes);
      productTypes = await this.productTypesRepository.save(productTypes);

      const currentLevelMap = new Map<string, string>();

      for (const product of productTypes) {
        currentLevelMap.set(product.id, product.name);

        // If this node has children (not a leaf), recursively process the next level
        if (product.isLeaf === false) {
          // product's ID as the cache key for its children
          await this.syncProductLevel(product.id, product.id, options);
        }
      }

      // Cache the map for the current level
      await this.cacheService.storeMap(cacheKey, currentLevelMap);
    } catch (error) {
      this.logger.error(`Error syncing product level with parent ID ${parentId}: ${error}`, this.syncProductLevel.name);
    }
  }

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
      options.data = await this.getCreateProductPayload(store, product, locations);
      const response = await this.utilsService.requestToShopify('post', options);

      console.log(response);
      console.log(response.respBody);
      console.log(response.respBody['data']['productCreate']);
      if (response.statusCode === 201) {
        //create the variants which get associated with the productID
        options.data = this.getProductVariantsPayload(
          response.respBody['data']['productsCreate']['product']['id'],
          data,
        );
        const variantsResponse = await this.utilsService.requestToShopify('post', options);
      }
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
    const category = product.product_type;
    const productData = `(input: {category: "${category}", title:"${product.title}",vendor:"${product.vendor}", descriptionHtml:"${product.desc}", tags:${JSON.stringify(product.tags)}})`;
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

  private getProductVariantsPayload = (id: string, data: any): { query: string } => {
    try {
      let variantsData;

      const query = `mutation {
        productVariantsBulkCreate${variantsData}{
              productVariants {
          id
          title
          selectedOptions {
            name
            value
          }
        }
        userErrors {
          field
          message
        }
      }
    }`;

      return { query };
    } catch (error) {
      this.logger.error(error.message, this.getProductVariantsPayload.name);
    }
  };
}
