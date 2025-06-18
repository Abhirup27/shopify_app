import { Customer } from 'src/database/entities/customer.entity';
import { Order } from 'src/database/entities/order.entity';
import { Product } from 'src/database/entities/product.entity';
import { ProductType } from 'src/database/entities/productType.entity';
import { Store } from 'src/database/entities/store.entity';
import { StoreLocations } from 'src/database/entities/storeLocations.entity';
import { UserStore } from 'src/database/entities/userstore.entity';
import { newProductDto } from 'src/web-app/dtos/new-product.dto';
import { RegisterUserDto } from 'src/web-app/dtos/register-member.dto';
import { User } from '../../database/entities/user.entity';

/**
 * all the queues used in jobs module. Immutable.
 * */
export const QUEUES = {
  PRODUCTS: 'products',
  ORDERS: 'orders',
  USERS: 'users',
  STORES: 'stores',
  CUSTOMERS: 'customers',
  CONFIGURE: 'configure',
  CRON: 'cron',
} as const;

/**
 * All job type constants
 * */
export const JOB_TYPES = {
  CHECK_PENDING_PAYMENTS: 'check-pending-pay', // To check all the pending billing
  SUBSCRIPTION_STATUS: 'subscription-status', // cron task to check for status of each active subscription, once every 24 hours
  SYNC_PRODUCTS: 'sync-products',
  GET_PRODUCTS: 'retrieve-products',
  CREATE_PRODUCT: 'create-product',
  GET_PRODUCT_TYPES: 'retrieve-product-types',
  GET_PRODUCT_TYPE_NAMES: 'retrieve-product-type-names',
  GET_PRODUCT_TYPES_DB: 'retrieve-product-types-db',
  SYNC_PRODUCT_TYPES: 'sync-product-types',
  CHECK_PRODUCT_TYPE: 'check-product-type',

  SYNC_ORDERS: 'sync-orders',
  GET_ORDERS: 'retrieve-orders',
  GET_ORDER: 'retrieve-order-details',

  SYNC_STORE: 'sync-store',
  SYNC_STORES: 'sync-stores',
  SYNC_STORE_LOCATIONS: 'sync-store-locations',
  ACTIVATE_TRIAL: 'activate-trial',
  BUY_STORE_PLAN: 'buy-store-plan',
  GET_STORES: 'retrieve-stores',
  GET_STORE: 'retrieve-store',

  GET_STORE_LOCATIONS: 'retrieve-store-locations',

  SYNC_CUSTOMERS: 'sync-customers',
  GET_CUSTOMERS: 'retrieve-customers',

  GET_USERS: 'retrieve-users',
  GET_STORES_FOR_USER: 'retrieve-stores-users',
  CREATE_USER: 'create-user',
  UPDATE_STORE_TOKEN: 'update-store-token',

  CONFIGURE_WEBHOOKS: 'configure-webhooks',
  CACHE_PRODUCT_TYPES: 'cache-product-types',
} as const;

/**
 * This type is used for addJob function in the jobs service and the respective consumers.
 * It acts as a single source of truth. Avoids mismatches and reduces lines of code in jobs service.
 * */
export type errorResult = {
  status: string;
  shopDomain: string;
};
export type JobRegistry = {
  /** for product jobs*/
  [JOB_TYPES.SYNC_PRODUCTS]: {
    queue: typeof QUEUES.PRODUCTS;
    data: { store: Store };
    result: boolean;
  };
  [JOB_TYPES.GET_PRODUCTS]: {
    queue: typeof QUEUES.PRODUCTS;
    data: { store: number | Store };
    result: Product[];
  };
  [JOB_TYPES.CREATE_PRODUCT]: {
    queue: typeof QUEUES.PRODUCTS;
    data: { product: newProductDto; store: Store };
    result: boolean;
  };
  [JOB_TYPES.GET_PRODUCT_TYPE_NAMES]: {
    queue: typeof QUEUES.PRODUCTS;
    data: { level: number };
    result: string[];
  };
  [JOB_TYPES.GET_PRODUCT_TYPES]: {
    queue: typeof QUEUES.PRODUCTS;
    data: { id?: string | null };
    result: Record<string, string>;
  };
  [JOB_TYPES.GET_PRODUCT_TYPES_DB]: {
    queue: typeof QUEUES.PRODUCTS;
    data: null;
    result: ProductType[];
  };
  [JOB_TYPES.SYNC_PRODUCT_TYPES]: {
    queue: typeof QUEUES.PRODUCTS;
    data: { store: Store };
    result: null | errorResult;
  };
  [JOB_TYPES.CACHE_PRODUCT_TYPES]: {
    queue: typeof QUEUES.PRODUCTS;
    data: null;
    result: void;
  };
  [JOB_TYPES.CHECK_PRODUCT_TYPE]: {
    queue: typeof QUEUES.PRODUCTS;
    data: { name: string };
    result: boolean;
  };
  /** for order jobs*/
  [JOB_TYPES.SYNC_ORDERS]: {
    queue: typeof QUEUES.ORDERS;
    data: { store: Store };
    result: { status?: string; shopDomain?: string } | boolean;
  };
  [JOB_TYPES.GET_ORDERS]: {
    queue: typeof QUEUES.ORDERS;
    data: { storeId: number };
    result: Order[];
  };
  [JOB_TYPES.GET_ORDER]: {
    queue: typeof QUEUES.ORDERS;
    data: { orderId: number };
    result: Order;
  };
  /** for stores*/
  [JOB_TYPES.SYNC_STORE]: {
    queue: typeof QUEUES.STORES;
    data: { storeId: number };
    result: void;
  };
  [JOB_TYPES.SYNC_STORES]: {
    queue: typeof QUEUES.STORES;
    data:   {};
    result: void;
  };
  [JOB_TYPES.SYNC_STORE_LOCATIONS]: {
    queue: typeof QUEUES.STORES;
    data: { store: Store };
    result: StoreLocations[] | null | { status: string; shopDomain: string };
  };
  [JOB_TYPES.ACTIVATE_TRIAL]: {
    queue: typeof QUEUES.STORES;
    data: { store: Store; user: User };
    result: boolean;
  };
  [JOB_TYPES.BUY_STORE_PLAN]: {
    queue: typeof QUEUES.STORES;
    data: { store: Store; planId: number; userId: number };
    result: string;
  };
  [JOB_TYPES.GET_STORE]: {
    queue: typeof QUEUES.STORES;
    data: { storeId: number };
    result: Store;
  };
  //This job is not defined in stores.consumer
  [JOB_TYPES.GET_STORES]: {
    queue: typeof QUEUES.STORES;
    data: { userId: number };
    result: Store[];
  };
  [JOB_TYPES.GET_STORE_LOCATIONS]: {
    queue: typeof QUEUES.STORES;
    data: { storeId: number };
    result: StoreLocations[];
  };

  /**For Customer queue jobs*/
  [JOB_TYPES.SYNC_CUSTOMERS]: {
    queue: typeof QUEUES.CUSTOMERS;
    data: { store: Store };
    result: void;
  };
  [JOB_TYPES.GET_CUSTOMERS]: {
    queue: typeof QUEUES.CUSTOMERS;
    data: { storeId: number };
    result: Customer[];
  };

  /**For User Queue Jobs*/
  [JOB_TYPES.GET_USERS]: {
    queue: typeof QUEUES.USERS;
    data: { storeId: number };
    result: UserStore[];
  };
  [JOB_TYPES.GET_STORES_FOR_USER]: {
    queue: typeof QUEUES.USERS;
    data: { userId: number };
    result: UserStore[];
  };
  [JOB_TYPES.CREATE_USER]: {
    queue: typeof QUEUES.USERS;
    data: { user: RegisterUserDto; storeId: number };
    result: UserStore;
  };
  [JOB_TYPES.UPDATE_STORE_TOKEN]: {
    queue: typeof QUEUES.STORES;
    data: { store: Store; accessToken: string };
    result: boolean;
  };
  [JOB_TYPES.CONFIGURE_WEBHOOKS]: {
    queue: typeof QUEUES.CONFIGURE;
    data: { storeId: number };
    result: void;
  };
  /** Cron jobs*/
  [JOB_TYPES.CHECK_PENDING_PAYMENTS]: {
    queue: typeof QUEUES.CRON;
    data: {};
    result: void;
  };
  [JOB_TYPES.SUBSCRIPTION_STATUS]: {
    queue: typeof QUEUES.CRON;
    data: {};
    result: void;
  };
};

export type JobType = keyof JobRegistry;

/**
 *Union of all queue names which are used in the Job registry.
 * */
export type QueueName = JobRegistry[JobType]['queue'];

export const jobToQueueMap: { [K in JobType]: QueueName } = {
  [JOB_TYPES.CONFIGURE_WEBHOOKS]: QUEUES.CONFIGURE,
  [JOB_TYPES.SYNC_PRODUCTS]: QUEUES.PRODUCTS,
  [JOB_TYPES.CREATE_PRODUCT]: QUEUES.PRODUCTS,
  [JOB_TYPES.GET_PRODUCT_TYPE_NAMES]: QUEUES.PRODUCTS,
  [JOB_TYPES.GET_PRODUCT_TYPES]: QUEUES.PRODUCTS,
  [JOB_TYPES.GET_PRODUCT_TYPES_DB]: QUEUES.PRODUCTS,
  [JOB_TYPES.SYNC_PRODUCT_TYPES]: QUEUES.PRODUCTS,
  [JOB_TYPES.CACHE_PRODUCT_TYPES]: QUEUES.PRODUCTS,
  [JOB_TYPES.CHECK_PRODUCT_TYPE]: QUEUES.PRODUCTS,

  [JOB_TYPES.SYNC_CUSTOMERS]: QUEUES.CUSTOMERS,
  [JOB_TYPES.SYNC_STORE]: QUEUES.STORES,
  [JOB_TYPES.SYNC_STORES]: QUEUES.STORES,
  [JOB_TYPES.SYNC_STORE_LOCATIONS]: QUEUES.STORES,
  [JOB_TYPES.ACTIVATE_TRIAL]: QUEUES.STORES,
  [JOB_TYPES.BUY_STORE_PLAN]: QUEUES.STORES,

  [JOB_TYPES.SYNC_ORDERS]: QUEUES.ORDERS,
  [JOB_TYPES.GET_STORES]: QUEUES.STORES,
  [JOB_TYPES.GET_STORE]: QUEUES.STORES,
  [JOB_TYPES.GET_STORE_LOCATIONS]: QUEUES.STORES,

  [JOB_TYPES.GET_ORDER]: QUEUES.ORDERS,
  [JOB_TYPES.GET_ORDERS]: QUEUES.ORDERS,

  [JOB_TYPES.GET_USERS]: QUEUES.USERS,
  [JOB_TYPES.GET_STORES_FOR_USER]: QUEUES.USERS,
  [JOB_TYPES.CREATE_USER]: QUEUES.USERS,

  [JOB_TYPES.GET_CUSTOMERS]: QUEUES.CUSTOMERS,
  [JOB_TYPES.GET_PRODUCTS]: QUEUES.PRODUCTS,

  [JOB_TYPES.UPDATE_STORE_TOKEN]: QUEUES.STORES,

  [JOB_TYPES.SUBSCRIPTION_STATUS]: QUEUES.CRON,
  [JOB_TYPES.CHECK_PENDING_PAYMENTS]: QUEUES.CRON,
};

/**
 * A mapped type which only accepts queue names from JobRegistry which are there in QueueName, if  yes then it returns the job name. queue names which do not match won't be accepted by any of the queues.
 * The [Job type] turns the object into a union type.
 * */
export type QueueJobTypes<Q extends QueueName> = {
  [K in JobType]: JobRegistry[K]['queue'] extends Q ? K : never;
}[JobType];

/**
 * This type gets all the jobs registry for a Queue and extracts the data, creating a union of their data types.
 * */
export type QueueData<Q extends QueueName> = JobRegistry[QueueJobTypes<Q>]['data'];

/**
 * This type gets all the jobs registry for a Queue and extracts the result, creating a union of their return/result types.
 */

export type QueueResult<Q extends QueueName> = JobRegistry[QueueJobTypes<Q>]['result'];
