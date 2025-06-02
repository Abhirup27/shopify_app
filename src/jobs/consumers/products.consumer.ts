import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { JOB_TYPES, JobRegistry, QUEUES } from '../constants/jobs.constants';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from 'src/utils/utils.service';
import { Store } from 'src/database/entities/store.entity';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Job, UnrecoverableError } from 'bullmq';
import { ShopifyRequestOptions } from 'src/types/ShopifyRequestOptions';
import { AxiosHeaders } from 'axios';
import { Product } from 'src/database/entities/product.entity';
import { ShopifyResponse } from 'src/types/ShopifyResponse';
import { Logger } from '@nestjs/common';
import { newProductDto } from 'src/web-app/dtos/new-product.dto';
import { StoreLocations } from 'src/database/entities/storeLocations.entity';
import { CacheProvider } from '../providers/cache-redis.provider';
import { ProductType } from 'src/database/entities/productType.entity';
import { VariantDto } from 'src/web-app/dtos/product-variant.dto';
import { InventoryLevel, ProductVariant } from 'src/database/entities/productVariant.entity';
import { TokenExpiredException } from '../token-expired.exception';
import { DataService } from 'src/data/data.service';

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

/**
 *The expected response of taxonomy query.
 * */
type ProductTypesResponse = {
  data: {
    taxonomy: {
      categories: {
        nodes: ProductsType[];
      };
    };
  };
};

/**
 * Expected Response type of ProductCreate mutation.
 * */
type ProductSyncResponse = {
  data: {
    products: {
      edges: Array<{
        node: {
          id: string;
          title: string;
          category: {
            id: string;
          };
          descriptionHtml: string;
          handle: string;
          createdAt: string;
          productType: string;
          tags: string[];
          status: string;
          totalInventory: number;
          vendor: string;
          updatedAt: string;
          legacyResourceId: string;
          compareAtPriceRange: {
            maxVariantCompareAtPrice: { amount: number };
            minVariantCompareAtPrice: { amount: number };
          };
          priceRangeV2: {
            maxVariantPrice: { amount: number };
            minVariantPrice: { amount: number };
          };
          variantsCount: { count: number };
          variants: {
            edges: Array<{
              node: {
                compareAtPrice: number;
                displayName: string;
                id: string;
                price: number;
                sku: string;
                title: string;
                inventoryQuantity: number;
                inventoryItem: {
                  id: string;
                  createdAt: string;
                  sku: string;
                  updatedAt: string;

                  inventoryLevels: {
                    edges: Array<{
                      node: {
                        id: string;
                        location: {
                          id: string;
                          isActive: boolean;
                        };
                        quantities: Array<{
                          id: string;
                          name: string;
                          quantity: number;
                          updatedAt: string;
                        }>;
                      };
                    }>;
                  };
                };
                createdAt: string;
                updatedAt: string;
              };
            }>;
            pageInfo: {
              hasNextPage: boolean;
            };
          };
        };
        cursor: string;
      }>;
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string;
      };
    };
  };
};

type ProductCreateResponse = {
  data: {
    productCreate: {
      product: {
        id: string;
        title: string;
        publishedAt: string;
        options: Array<{
          id: string;
          name: string;
          position: number;
          optionsValues: Array<{
            id: string;
            name: string;
            hasVariants: boolean;
          }>;
        }>;
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
    private readonly dataService: DataService,
    private readonly cacheService: CacheProvider,
    private readonly configService: ConfigService,
    private readonly utilsService: UtilsService,

    /**for protuct types table*/
    @InjectEntityManager()
    private entityManager: EntityManager,

    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,

    @InjectRepository(ProductType)
    private readonly productTypesRepository: Repository<ProductType>,

    @InjectRepository(ProductVariant)
    private readonly productVariantsRepository: Repository<ProductVariant>,
  ) {
    super();
  }
  public process = async (job: ProductsQueueJob): Promise<JobRegistry[ProductsQueueJobName]['result']> => {
    try {
      switch (job.name) {
        case JOB_TYPES.SYNC_PRODUCTS:
          return await this.syncProducts(job.data, job);
        case JOB_TYPES.GET_PRODUCTS:
          return await this.retrieveProducts(job.data);
        case JOB_TYPES.CREATE_PRODUCT:
          return await this.createProduct(job.data, job);
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
      this.logger.error(error.message, error.stack);
      // await job.retry('failed');
      //console.log(error['isTokenExpired']);

      // job.discard;
      // console.log(await job.moveToFailed(error, '0', true));
      if (error['isTokenExpired']) {
        await job.moveToFailed(new UnrecoverableError(`401`), job.token);
      }
      //job.discard();
    }
  };
  private isJobOfType<T extends keyof JobRegistry>(
    job: Job<JobRegistry[keyof JobRegistry]['data'], JobRegistry[keyof JobRegistry]['result']>,
    name: T,
  ): job is Job<JobRegistry[T]['data'], JobRegistry[T]['result']> {
    return job.name === name;
  }
  private syncProductsQuery = (cursor: string = ''): { query: string } => {
    const filter = cursor != '' ? `(first: 250, after: ${cursor})` : `(first: 250)`;
    const query = `{
      products${filter} {
        edges {
          node {
            id
            title
            category{
              id
            }
            descriptionHtml
            handle
            createdAt
            productType
	          tags
            status
            totalInventory
            vendor
            updatedAt
            legacyResourceId
            compareAtPriceRange{
              maxVariantCompareAtPrice{amount}
              minVariantCompareAtPrice{amount}
            }
            priceRangeV2{
              maxVariantPrice{amount}
              minVariantPrice{amount}
            }
            variantsCount{count}
            variants(first: 15){
              edges{
                node {
                  compareAtPrice
                  displayName
                  id
                  price
                  sku
                  title
                  inventoryQuantity
                  inventoryItem {
                    id
                    createdAt
                    sku
                    updatedAt
                    inventoryLevels(first: 10){
                      edges{
                        node{
                          id
                          location{
                           id
                          isActive
                          }
                          quantities(names: ["available"]){
                            id
                            name
                            quantity
                            updatedAt
                          }
                        }
                      }
                    }
                  }
                  createdAt
                  updatedAt
                }
              }
              pageInfo {
                hasNextPage
              }
            }
          }
          cursor
        }
        pageInfo{
          hasNextPage
          endCursor
        }
      }
    }`;

    return { query };
  };
  private syncProducts = async (
    data: JobRegistry[typeof JOB_TYPES.SYNC_PRODUCTS]['data'],
    job: Job,
  ): Promise<JobRegistry[typeof JOB_TYPES.SYNC_PRODUCTS]['result']> => {
    //  try {
    // const store = store ?? null;
    const totalProducts: any[] = [];
    const totalProductVariants: any[] = [];
    let cursor: string | null = null;
    //      let since_id: number = 0;
    const requestOptions: ShopifyRequestOptions = { url: null, headers: null };
    requestOptions.headers = new AxiosHeaders()
      .set('Content-Type', 'application/json')
      .set('X-Shopify-Access-Token', data.store.access_token);

    /* requestOptions.url = await this.utilsService.getShopifyURLForStore(
       `products.json?since_id=${since_id}`,
       data.store,
     );*/
    requestOptions.url = this.utilsService.getShopifyURLForStore('graphql.json', data.store);
    requestOptions.data = this.syncProductsQuery('');

    let response = await this.utilsService.requestToShopify<ProductSyncResponse>('post', requestOptions);
    //if(response.error == false && response.statusCode == 200){
    // this.logger.debug(JSON.stringify(response.respBody));
    // }
    //
    console.log('products ran');
    if (response.statusCode == 401) {
      //  console.log(JSON.stringify(response));
      //console.log(job.token);
      console.log('in syncproduct', job.data);
      //await job.moveToFailed(new UnrecoverableError(`token expired for ${data.store.table_id}`), job.token);
      //job.discard();
      throw new TokenExpiredException(`Token expired for ${data.store.table_id}`, {
        shop: data.store.table_id.toString(),
        jobId: job.id,
      });
      //await job.remove();
      //return;
      //await job.remove();

      //throw new UnrecoverableError('errror error');
      // throw new TokenExpiredException(`Token expired for ${data.store}`, {
      // shop: data.store.table_id.toString(),
      // jobId: '123',
      //});
    }
    const products: Product[] = [];
    do {
      //response.statusCode == 200 ? products.push(...response.respBody['products']) : null;
      const hasNextPage: boolean = response.respBody['data']['products']['pageInfo']['hasNextPage'];
      if (hasNextPage == true) {
        cursor = response.respBody['data']['products']['pageInfo']['endCursor'];
      } else {
        cursor = null;
      }
      const { products, productVariants } = await this.mapProductsToDB(response.respBody, data.store.table_id);
      totalProducts.push(...products);
      totalProductVariants.push(...productVariants);

      requestOptions.data = this.syncProductsQuery(cursor);
      response = await this.utilsService.requestToShopify<ProductSyncResponse>('post', requestOptions);
    } while (cursor !== null);

    const shopifyProductIds = totalProducts.map(p => p.id);
    const shopifyVariantIds = totalProductVariants.map(v => v.id);

    /*  await this.productVariantsRepository
        .createQueryBuilder()
        .delete()
        // .where('product_id IN (SELECT id FROM product WHERE store_id = :storeId)', { storeId: data.store.table_id })
        .where('id NOT IN (:...variantIds)', { variantIds: shopifyVariantIds })
        .execute();
    */
    await this.productsRepository
      .createQueryBuilder()
      .delete()
      .where('store_id = :storeId', { storeId: data.store.table_id })
      .andWhere('id NOT IN (:...productIds)', { productIds: shopifyProductIds })
      .execute();
    const productEntities: Product[] = this.productsRepository.create(totalProducts);
    await this.productsRepository.upsert(productEntities, ['id']);

    const productVaraintsEntities: ProductVariant[] = this.productVariantsRepository.create(totalProductVariants);
    await this.productVariantsRepository.upsert(productVaraintsEntities, ['id']);
    /* } catch (error) {
       console.log(error['code']);
       this.logger.error(error.message, error.stack, this.syncProducts.name);
 
     }*/
  };

  private extractIdFromGraphQLId(graphqlId: string, prefix?: string, removeSuffix: boolean = false): number | null {
    try {
      if (!graphqlId) {
        return null;
      }

      // Remove the prefix if provided
      const idPart = prefix ? graphqlId.replace(`gid://shopify/${prefix}/`, '') : graphqlId;
      let id: number = parseInt(idPart);
      if (removeSuffix) {
        const numericMatch = idPart.match(/^\d+/);

        if (!numericMatch) {
          this.logger.warn(`No numeric ID found in: ${graphqlId}`, this.extractIdFromGraphQLId.name);
          return null;
        }

        id = parseInt(numericMatch[0], 10);
      }
      if (isNaN(id)) {
        this.logger.warn(`Invalid numeric ID extracted from: ${graphqlId}`, this.extractIdFromGraphQLId.name);
        return null;
      }

      return id;
    } catch (error) {
      this.logger.error(`Failed to extract ID from ${graphqlId}: ${error.message}`, this.extractIdFromGraphQLId.name);
      return null;
    }
  }
  private mapProductsToDB = async (
    productsData: ProductSyncResponse,
    storeId: number,
  ): Promise<{ products: any[]; productVariants: any[] }> => {
    const products: Array<any> = [];
    const productVariants: any[] = [];
    for (const node of productsData.data.products.edges) {
      const product = node.node;
      for (const variantNode of product.variants.edges) {
        const variant = variantNode.node;
        const inventoryLevels: InventoryLevel[] = [];
        for (const inventoryLevelNode of variant.inventoryItem.inventoryLevels.edges) {
          const inventoryLevel = inventoryLevelNode.node;
          const payload: InventoryLevel = {
            id: this.extractIdFromGraphQLId(inventoryLevel.id, 'InventoryLevel', true),
            location: {
              id: this.extractIdFromGraphQLId(inventoryLevel.location.id, 'Location'),
              isActive: inventoryLevel.location.isActive,
            },
            quantities: inventoryLevel.quantities.map((quantity: any) => ({
              id: this.extractIdFromGraphQLId(quantity.id, 'InventoryQuantity'),
              name: quantity.name,
              quantity: quantity.quantity,
              updatedAt: quantity.updatedAt,
            })),
          };
          inventoryLevels.push(payload);
        }
        const payload = {
          id: this.extractIdFromGraphQLId(variant.id, 'ProductVariant'),
          product_id: this.extractIdFromGraphQLId(product.id, 'Product'),
          title: variant.title,
          displayName: variant.displayName,
          price: variant.price,
          sku: variant.sku,
          inventoryQuantity: variant.inventoryQuantity,
          compareAtPrice: variant.compareAtPrice,
          inventory_item_id: this.extractIdFromGraphQLId(variant.inventoryItem.id, 'InventoryItem'),
          inventory_item_sku: variant.inventoryItem.sku,
          inventory_item_created_at: new Date(variant.inventoryItem.createdAt),
          inventory_item_updated_at: new Date(variant.inventoryItem.updatedAt),
          inventory_levels: inventoryLevels,
          createdAt: new Date(variant.createdAt),
          updatedAt: new Date(variant.updatedAt),
        };
        productVariants.push(payload);
      }
      const payload = {
        id: this.extractIdFromGraphQLId(product.id, 'Product'),
        store_id: storeId,
        title: product.title,
        category_id: product.category ? product.category.id : '',
        vendor: product.vendor,
        created_at: new Date(product.createdAt),
        updated_at: new Date(product.updatedAt),
        body_html: product.descriptionHtml,
        handle: product.handle,
        tags: product.tags.join(','),
        product_type:
          product.productType != ''
            ? product.productType
            : product.category != null
              ? this.dataService.getCategoryName(product.category.id)
              : '',
        admin_graphql_api_id: product.legacyResourceId ? product.legacyResourceId : '',
        inventoryTotal: product.totalInventory,
        // variants: productVariants,
      };
      products.push(payload);
    }
    return { products, productVariants };
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
      if (await this.productsRepository.existsBy({ id: productCreated.id })) {
        const result = await this.productsRepository.update({ id: productCreated.id }, productCreated);
      } else {
        productCreated = await this.productsRepository.save(payload, {});
      }
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

    return products;
    /*return Promise.resolve(
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
    );*/
  };
  private isArray(array: unknown): array is string[] {
    return Array.isArray(array) && array.every(item => typeof item === 'string');
  }

  private getProductTypes = async (
    data: JobRegistry[typeof JOB_TYPES.GET_PRODUCT_TYPES]['data'],
  ): Promise<JobRegistry[typeof JOB_TYPES.GET_PRODUCT_TYPES]['result']> => {
    if (data.id != null) {
      return await this.dataService.getProductCategoryMap(data.id);
    }
    const result = await this.dataService.getProductCategoryMap('product-types');

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

        const currentLevelMap: Record<string, string> = {};

        for (const product of children) {
          currentLevelMap[product.id] = product.name;
          // If this node has children (not a leaf), add it to the stack for processing
          if (product.isLeaf === false) {
            stack.push({
              parentId: product.id,
              cacheKey: product.id,
            });
          }
        }

        // Cache the map for the current level
        // await this.cacheService.storeMap(currentCacheKey, currentLevelMap);
        await this.dataService.setProductCategoryMap(currentCacheKey, currentLevelMap);
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

      const currentLevelMap: Record<string, string> = {};

      for (const product of productTypes) {
        currentLevelMap[product.id] = product.name;

        // If this node has children (not a leaf), recursively process the next level
        if (product.isLeaf === false) {
          // product's ID as the cache key for its children
          await this.syncProductLevel(product.id, product.id, options);
        }
      }

      // Cache the map for the current level
      await this.dataService.setProductCategoryMap(cacheKey, currentLevelMap);
      //await this.cacheService.storeMap(cacheKey, currentLevelMap);
    } catch (error) {
      this.logger.error(
        `Error syncing product level with parent ID ${parentId}: ${error}`,
        error.stack,
        this.syncProductLevel.name,
      );
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
    job: Job,
  ): Promise<JobRegistry[typeof JOB_TYPES.CREATE_PRODUCT]['result']> => {
    const store: Store = data.store;
    const product: newProductDto = data.product;
    const locations: StoreLocations[] = [];
    const options: ShopifyRequestOptions = {
      url: this.utilsService.getShopifyURLForStore('graphql.json', store),
      headers: this.utilsService.getGraphQLHeadersForStore(store),
    };
    options.data = await this.getCreateProductPayload(store, product, locations);
    const response = await this.utilsService.requestToShopify('post', options);

    //console.log(response);
    // console.log(response.respBody);

    if (response.statusCode === 401) {
      throw new TokenExpiredException(`Token expired for ${data.store.table_id}`, {
        shop: data.store.table_id.toString(),
        jobId: job.id,
      });
    }
    if (response.statusCode === 200) {
      //create the variants which get associated with the productID
      this.logger.error(JSON.stringify(response.respBody));
      options.data = this.getProductVariantsPayload(
        response.respBody['data']['productCreate']['product']['id'],
        data.product.variants,
      );
      const variantsResponse = await this.utilsService.requestToShopify('post', options);
      console.log(
        'this is the variants response',
        variantsResponse.respBody['data']['productVariantsBulkCreate']['productVariants'],
      );
      this.logger.debug(JSON.stringify(variantsResponse));
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
    // const p_categoy = category.substring(0, category.lastIndexOf('-'));
    //const categoryName = await this.cacheService.getMapField(p_categoy, category);
    console.log(category);
    const categoryName = await this.dataService.getCategoryName(category);
    console.log(categoryName);
    const productData = `(input: {category: "${category}", productType: "${categoryName}", title:"${product.title}",vendor:"${product.vendor}", descriptionHtml:"${product.desc}", tags:${JSON.stringify(product.tags)}})`;
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
  private getProductVariantsPayload = (productId: string, data: VariantDto[]): { query: string } => {
    try {
      console.log(data);
      const variantsInput = data
        .map(variant => {
          // Build inventory quantities array
          const inventoryQuantities = variant.inventory
            .map(
              inv => `{
            availableQuantity: ${inv.quantity}
            locationId: "gid://shopify/Location/${inv.locationId}"
          }`,
            )
            .join('\n          ');

          return `{
          optionValues: [{
            name: "${variant.title}",
            optionName: "Title"
          }],
          inventoryItem: {
            sku: "${variant.sku}",
          },
          price: "${variant.price}",
          compareAtPrice: "${variant.compareAtPrice}",
          inventoryQuantities: [${inventoryQuantities}]
        }`;
        })
        .join('\n        ');

      const query = `mutation {
      productVariantsBulkCreate(productId: "${productId}", variants: [${variantsInput}]){
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
      console.error('Error building product variants payload:', error);
      throw error;
    }
  };
}
