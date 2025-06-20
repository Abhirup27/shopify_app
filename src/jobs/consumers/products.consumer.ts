import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { JOB_TYPES, JobRegistry, QUEUES } from '../constants/jobs.constants';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from 'src/utils/utils.service';
import { Store } from 'src/database/entities/store.entity';
import { EntityManager, Repository } from 'typeorm';
import { Job, UnrecoverableError } from 'bullmq';
import { ShopifyRequestOptions } from 'src/utils/types/ShopifyRequestOptions';
import { AxiosHeaders } from 'axios';
import { Product } from 'src/database/entities/product.entity';
import { ShopifyResponse } from 'src/utils/types/ShopifyResponse';
import { Logger } from '@nestjs/common';
import { newProductDto } from 'src/web-app/dtos/new-product.dto';
import { StoreLocations } from 'src/database/entities/storeLocations.entity';
import { ProductType } from 'src/database/entities/productType.entity';
import { VariantDto } from 'src/web-app/dtos/product-variant.dto';
import { InventoryLevel, ProductVariant } from 'src/database/entities/productVariant.entity';
import { TokenExpiredException } from '../token-expired.exception';
import { DataService } from 'src/data/data.service';
import {
  CreateProductDocument,
  CreateProductMutation,
  CreateProductVariantsBulkDocument,
  CreateProductVariantsBulkMutation,
  ProductInput,
  ProductVariantsBulkInput,
  SyncProductsDocument,
  SyncProductsQuery,
} from 'src/generated/graphql';
import { print } from 'graphql';
import { Lock } from 'redlock';
import { instanceOf } from 'graphql/jsutils/instanceOf';
import { CacheService } from '../../data/cache/cache.service';

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

  taxonomy: {
    categories: {
      nodes: ProductsType[];
    };
  };

};

/**
 * Expected Response type of ProductCreate mutation.
 * */

type ProductsQueueJobName =
  | typeof JOB_TYPES.SYNC_PRODUCTS
  | typeof JOB_TYPES.GET_PRODUCTS
  | typeof JOB_TYPES.CREATE_PRODUCT
  | typeof JOB_TYPES.GET_PRODUCT_TYPES
  | typeof JOB_TYPES.GET_PRODUCT_TYPES_DB
  | typeof JOB_TYPES.SYNC_PRODUCT_TYPES
  | typeof JOB_TYPES.CACHE_PRODUCT_TYPES;

// Create union type of Job objects for these jobs
type ProductsQueueJob = {
  [K in ProductsQueueJobName]: Job<JobRegistry[K]['data'], JobRegistry[K]['result']> & { name: K };
}[ProductsQueueJobName];

@Processor(QUEUES.PRODUCTS, { concurrency: 10 })
export class ProductsConsumer extends WorkerHost {
  private readonly logger = new Logger(ProductsConsumer.name);

  /**
   * Initialize all the graphql queries from AST to a string.
   * */
  private readonly syncProductsQueryString: string = print(SyncProductsDocument);
  private readonly createProductMutation: string = print(CreateProductDocument);
  private readonly createProductVariantsBulk: string = print(CreateProductVariantsBulkDocument);

  constructor(
    private readonly cacheService:  CacheService,
    private readonly dataService: DataService,
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

  public setProductCategorySyncStatus = async (status: boolean): Promise<boolean> => {
    return await this.cacheService.set('productCategorySyncStatus', status, 0);
  };

  async getCategoryName(id: string): Promise<string> {
    const parent = id.substring(0, id.lastIndexOf('-'));

    if (parent != '') {
      return await this.cacheService.get<Record<string, string>>(parent).then(value => {
        return value[id];
      });
    } else {
      return await this.cacheService.get<Record<string, string>>('product-types').then(value => {
        return value[id];
      });
    }
  }
  private isJobOfType<T extends keyof JobRegistry>(
    job: Job<JobRegistry[keyof JobRegistry]['data'], JobRegistry[keyof JobRegistry]['result']>,
    name: T,
  ): job is Job<JobRegistry[T]['data'], JobRegistry[T]['result']> {
    return job.name === name;
  }

  private syncProductsQuery = (cursor: string | null = null) => ({
    query: this.syncProductsQueryString, // Auto-generated document
    variables: { cursor },
  });

  private syncProducts = async (
    data: JobRegistry[typeof JOB_TYPES.SYNC_PRODUCTS]['data'],
    job: Job,
  ): Promise<JobRegistry[typeof JOB_TYPES.SYNC_PRODUCTS]['result']> => {

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
    requestOptions.data = this.syncProductsQuery();

    let response = await this.utilsService.requestToShopify<SyncProductsQuery>('post', requestOptions);

    if (response.statusCode == 401) {
      throw new TokenExpiredException(`Token expired for ${data.store.table_id}`, {
        shop: data.store.table_id.toString(),
        jobId: job.id,
      });
      //await job.remove();
    }
    do {
      //response.statusCode == 200 ? products.push(...response.respBody['products']) : null;
      const hasNextPage: boolean = response.respBody.products.pageInfo.hasNextPage;
      if (hasNextPage == true) {
        cursor = response.respBody['products']['pageInfo']['endCursor'];
      } else {
        cursor = null;
      }
      const { products, productVariants } = await this.mapProductsToDB(response.respBody, data.store.table_id);
      totalProducts.push(...products);
      totalProductVariants.push(...productVariants);

      requestOptions.data = this.syncProductsQuery(cursor);
      response = await this.utilsService.requestToShopify<SyncProductsQuery>('post', requestOptions);
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
    // The query gives an error if there are no products in the store, So I'll have to refactor or do an else condition.
    if( shopifyProductIds.length> 0 ) {


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
    }
    return true;
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
    productsData: SyncProductsQuery,
    storeId: number,
  ): Promise<{ products: any[]; productVariants: any[] }> => {
    const products: Array<any> = [];
    const productVariants: any[] = [];
    for (const node of productsData.products.edges) {
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
              id: quantity.id,
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
              ? await this.getCategoryName(product.category.id)
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
        category_id: product.category_id,
        inventoryTotal: product.inventoryTotal,
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

  };

  private isArray(array: unknown): array is string[] {
    return Array.isArray(array) && array.every(item => typeof item === 'string');
  }

  private getProductTypes = async (
    data: JobRegistry[typeof JOB_TYPES.GET_PRODUCT_TYPES]['data'],
  ): Promise<JobRegistry[typeof JOB_TYPES.GET_PRODUCT_TYPES]['result']> => {
    if (data.id != null) {
      return await this.cacheService.get<Record<string, string>>(data.id);
    }
    const result = await this.cacheService.get<Record<string, string>>('product-types');

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

          //if there are no root types, that means it has not been synced from shopify to DB ever, so abort
          if(children.length == 0) {
            return;
          }
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
        //await this.dataService.setProductCategoryMap(currentCacheKey, currentLevelMap);
        await this.cacheService.set(currentCacheKey, currentLevelMap, 0);
        await this.setProductCategorySyncStatus(true);
      }
    } catch (error) {
      this.logger.error(
        `Error syncing product level with parent ID ${parentId}: ${error}`,
        this.cacheProductTypes.name,
      );
    }
  }

  private getProductTypeUpdated = async (tableName: string = 'product_type'): Promise<Date | null> => {
    const result = await this.entityManager.query(`SELECT last_updated
                                                   FROM table_metadata
                                                   WHERE table_name = $1`, [ tableName, ]);

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
         return;
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
      if (response.statusCode === 401) {
        throw new TokenExpiredException(`Token expired`, {
          shop: '',
          jobId: '',
        });
      }

      let productTypes = response.respBody?.taxonomy?.categories?.nodes || [];

      if (!productTypes.length) return;

      //starting to update the cache
      await this.setProductCategorySyncStatus(false);

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
      await this.cacheService.set(cacheKey, currentLevelMap);
      await this.setProductCategorySyncStatus(true);
      //await this.cacheService.storeMap(cacheKey, currentLevelMap);
    } catch (error) {
      if (error instanceof TokenExpiredException) {
        throw error;
      }
      this.logger.error(
        `Error syncing product level with parent ID ${parentId}: ${error}`,
        error.stack,
        this.syncProductLevel.name,
      );

    }
  }

  private createProduct = async (
    data: JobRegistry[typeof JOB_TYPES.CREATE_PRODUCT]['data'],
    job: Job,
  ): Promise<JobRegistry[typeof JOB_TYPES.CREATE_PRODUCT]['result']> => {
    let lock: Lock;
    let credits: number;
    try{

      lock = await this.dataService.getStoreCreditsLock(data.store.id);
      this.logger.debug(JSON.stringify(lock));
      credits = await this.dataService.getStoreCredits(data.store.id);

     // const credits = await this.dataService.readStoreCredits(data.store.id);
      console.log(credits);
      if( isNaN(credits) || credits == undefined ){
        job.delay = 2000;
        //await job.moveToDelayed(2000, job.token);
        await job.moveToFailed(new Error('lock or credits not found.'), job.token);
       return true;
      }
      if( credits < 2 ) {
        await job.moveToFailed(new UnrecoverableError('credits too low for the operation.'), job.token);
        return true;
      }
    } catch( error ) {
      throw error;
    }
    const store: Store = data.store;
    const product: newProductDto = data.product;
    const locations: StoreLocations[] = [];
    const options: ShopifyRequestOptions = {
      url: this.utilsService.getShopifyURLForStore('graphql.json', store),
      headers: this.utilsService.getGraphQLHeadersForStore(store),
    };
    options.data = await this.getCreateProductPayload(store, product, locations);
    const response = await this.utilsService.requestToShopify<CreateProductMutation>('post', options);

    if (response.statusCode === 401) {
      throw new TokenExpiredException(`Token expired for ${data.store.table_id}`, {
        shop: data.store.table_id.toString(),
        jobId: job.id,
      });
    }
    if (response.statusCode === 200 && response.respBody?.productCreate?.product) {
      const createdProduct = response.respBody.productCreate.product;
      //create the variants which get associated with the productID

      options.data = this.getProductVariantsPayload(response.respBody.productCreate.product.id, data.product.variants);
      const variantsResponse = await this.utilsService.requestToShopify<CreateProductVariantsBulkMutation>(
        'post',
        options,
      );
      if (
        variantsResponse.statusCode !== 200 ||
        !variantsResponse.respBody?.productVariantsBulkCreate?.productVariants
      ) {
        throw new Error(`Variant creation failed: ${variantsResponse.statusCode}, ${variantsResponse.error}`);
      }

      const createdVariants = variantsResponse.respBody.productVariantsBulkCreate.productVariants;

      // 3. Map to DB entities
      const { product: productEntity, variants: variantEntities } = await this.mapCreatedProductToDB(
        createdProduct,
        createdVariants,
        data.product,
        store.table_id,
      );

      // 4. Save to database
      // await this.storeProductDB(productEntity);
      await this.productsRepository.upsert(productEntity, ['id']);

      for (const variant of variantEntities) {
        await this.productVariantsRepository.upsert(variant, ['id']);
      }
    }
    credits-= 2;
    await this.dataService.setStoreCredits(data.store.id, credits);
    await lock.release();
    return true;
  };
  private getCreateProductPayload = async (
    store: Store,
    product: newProductDto,
    location: StoreLocations[],
  ): Promise<{ query: string; variables: object }> => {
    console.log(product.title, product.vendor, product.desc, JSON.stringify(product.tags));
    const category = product.product_type;
    const categoryName = await this.getCategoryName(category);
    // const productData = `(input: {category: "${category}", productType: "${categoryName}", title:"${product.title}",vendor:"${product.vendor}", descriptionHtml:"${product.desc}", tags:${JSON.stringify(product.tags)}})`;

    const input: ProductInput = {
      category: category,
      productType: categoryName, // instead of taking a custom name, I just use the category name.
      title: product.title,
      vendor: product.vendor,
      descriptionHtml: product.desc,
      tags: product.tags,
    };
    return {
      query: this.createProductMutation,
      variables: { input: input },
    };
  };
  private getProductVariantsPayload = (productId: string, data: VariantDto[]): { query: string; variables: object } => {
    try {
      const variants = data.map(variant => ({
        optionValues: [
          {
            name: variant.title,
            optionName: 'Title',
          },
        ],
        inventoryItem: {
          sku: variant.sku,
        },
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        inventoryQuantities: variant.inventory.map(inv => ({
          availableQuantity: inv.quantity,
          locationId: `gid://shopify/Location/${inv.locationId}`,
        })),
      }));

      return {
        query: this.createProductVariantsBulk,
        variables: {
          productId: productId,
          variants,
        },
      };
    } catch (error) {
      console.error('Error building product variants payload:', error);
      throw error;
    }
  };

  private mapCreatedProductToDB = async (
    shopifyProduct: CreateProductMutation['productCreate']['product'],
    shopifyVariants: CreateProductVariantsBulkMutation['productVariantsBulkCreate']['productVariants'],
    dto: newProductDto,
    storeId: number,
  ): Promise<{ product: Product; variants: ProductVariant[] }> => {
    // Map product

    const productEntity: Product = new Product();
    productEntity.id = this.extractIdFromGraphQLId(shopifyProduct.id, 'Product');
    productEntity.store_id = storeId;
    productEntity.title = dto.title;
    productEntity.vendor = dto.vendor;
    productEntity.body_html = dto.desc || '';
    productEntity.handle = shopifyProduct.handle;
    productEntity.created_at = new Date(shopifyProduct.createdAt);
    productEntity.updated_at = new Date(shopifyProduct.updatedAt);
    productEntity.product_type = (await this.getCategoryName(dto.product_type)) ?? '';
    productEntity.tags = dto.tags?.join(',') || '';
    productEntity.admin_graphql_api_id = shopifyProduct.legacyResourceId;
    productEntity.category_id = dto.product_type;

    // Compute inventory total from DTO
    productEntity.inventoryTotal = dto.variants.reduce(
      (total, variant) => total + (variant.inventory?.reduce((sum, inv) => sum + inv.quantity, 0) || 0),
      0,
    );

    // Map variants
    const variantEntities: ProductVariant[] = [];
    const variantMap = new Map<string, VariantDto>();
    dto.variants.forEach(v => variantMap.set(v.sku, v));

    for (const shopifyVariant of shopifyVariants) {
      const dtoVariant = variantMap.get(shopifyVariant.sku);
      if (!dtoVariant) continue;
      const inventoryLevels: InventoryLevel[] = [];
      shopifyVariant.inventoryItem.inventoryLevels.edges.forEach(level => {
        inventoryLevels.push({
          id: this.extractIdFromGraphQLId(level.node.id, 'InventoryLevel', true),
          location: {
            id: this.extractIdFromGraphQLId(level.node.location.id, 'Location'),
            isActive: level.node.location.isActive,
          },
          quantities: [
            {
              id:
                'gid://shopify/InventoryQuantity/' +
                this.extractIdFromGraphQLId(level.node.id, 'InventoryLevel', false) +
                '&name=available',
              name: 'Available',
              quantity: dtoVariant.inventory.find(inv => inv.locationId === level.node.location.id)?.quantity || 0,
              updatedAt: new Date().toDateString(),
            },
          ],
        });
      });

      const variantEntity = new ProductVariant();
      variantEntity.id = this.extractIdFromGraphQLId(shopifyVariant.id, 'ProductVariant');
      variantEntity.product_id = productEntity.id;
      variantEntity.title = dtoVariant.title;
      variantEntity.displayName = shopifyVariant.displayName;
      variantEntity.price = dtoVariant.price;
      variantEntity.sku = dtoVariant.sku;
      variantEntity.compareAtPrice = dtoVariant.compareAtPrice;
      variantEntity.inventory_item_id = this.extractIdFromGraphQLId(shopifyVariant.inventoryItem.id, 'InventoryItem');
      variantEntity.inventory_item_sku = dtoVariant.sku;
      variantEntity.inventory_levels = [...inventoryLevels];
      variantEntity.inventory_item_created_at = new Date(shopifyVariant.inventoryItem.createdAt);
      variantEntity.inventory_item_updated_at = new Date(shopifyVariant.inventoryItem.updatedAt);
      variantEntity.createdAt = new Date(shopifyVariant.createdAt);
      variantEntity.updatedAt = new Date(shopifyVariant.updatedAt);

      // Calculate inventory quantity
      variantEntity.inventoryQuantity = dtoVariant.inventory?.reduce((sum, inv) => sum + inv.quantity, 0) || 0;

      variantEntities.push(variantEntity);
    }

    return { product: productEntity, variants: variantEntities };
  };
}
