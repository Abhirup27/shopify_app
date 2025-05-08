import { Processor, WorkerHost } from '@nestjs/bullmq';
import { JOB_TYPES, JobRegistry, QUEUES } from '../constants/jobs.constants';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from 'src/utils/utils.service';
import { Store } from 'src/database/entities/store.entity';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { ShopifyRequestOptions } from 'src/types/ShopifyRequestOptions';
import { AxiosHeaders } from 'axios';
import { Product } from 'src/database/entities/product.entity';
import { ShopifyResponse } from 'src/types/ShopifyResponse';
import { Logger } from '@nestjs/common';
import { newProductDto } from 'src/web-app/dtos/new-product.dto';
import { StoreLocations } from 'src/database/entities/storeLocations.entity';

type ProductsQueueJobName =
  | typeof JOB_TYPES.SYNC_PRODUCTS
  | typeof JOB_TYPES.GET_PRODUCTS
  | typeof JOB_TYPES.CREATE_PRODUCT;

// Create union type of Job objects for these jobs
type ProductsQueueJob = {
  [K in ProductsQueueJobName]: Job<JobRegistry[K]['data'], JobRegistry[K]['result']> & { name: K };
}[ProductsQueueJobName];

@Processor(QUEUES.PRODUCTS)
export class ProductsConsumer extends WorkerHost {
  private readonly logger = new Logger(ProductsConsumer.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly utilsService: UtilsService,

    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {
    super();
  }
  public process = async (job: ProductsQueueJob): Promise<JobRegistry[ProductsQueueJobName]['result']> => {
    try {
      switch (job.name) {
        case JOB_TYPES.SYNC_PRODUCTS:
          //return await this.handleSyncProducts(job);
          return await this.syncProducts(job.data);
        case JOB_TYPES.GET_PRODUCTS:
          // return await this.handleGetProducts(job);
          return await this.retrieveProducts(job.data);
        case JOB_TYPES.CREATE_PRODUCT:
          //  return await this.handleCreateProducts(job);
          return await this.createProduct(job.data);
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
    } catch (error) {
      this.logger.error(error, this.getCreateProductPayload.name);
    }

    return true;
  };
  private getCreateProductPayload = async (
    store: Store,
    product: newProductDto,
    location: StoreLocations[],
  ): Promise<{ mutation: string }> => {
    console.log(product.title, product.vendor, product.desc, JSON.stringify(product.tags));
    const productData = `(product: {category: "gid://shopify/TaxonomyCategory/me-1-3", title:"${product.title}",vendor:"${product.vendor}", description:"${product.desc}", tags:${JSON.stringify(product.tags)}})`;
    try {
      const mutation = `{
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
    }`;
      return { mutation };
    } catch (error) {
      this.logger.error(error, this.getCreateProductPayload.name);
      throw error; // Re-throw the error or return a default value
    }
  };
}
