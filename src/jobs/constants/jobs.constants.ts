import { Customer } from 'src/database/entities/customer.entity';
import { Order } from 'src/database/entities/order.entity';
import { Product } from 'src/database/entities/product.entity';
import { Store } from 'src/database/entities/store.entity';
import { StoreLocations } from 'src/database/entities/storeLocations.entity';
import { User } from 'src/database/entities/user.entity';
import { UserStore } from 'src/database/entities/userstore.entity';
import { newProductDto } from 'src/web-app/dtos/new-product.dto';
import { RegisterUserDto } from 'src/web-app/dtos/register-member.dto';

export const QUEUES = {
  PRODUCTS: 'products',
  ORDERS: 'orders',
  USERS: 'users',
  STORES: 'stores',
  CUSTOMERS: 'customers',
  CONFIGURE: 'configure',
} as const;

export const JOB_TYPES = {
  SYNC_PRODUCTS: 'sync-products',
  GET_PRODUCTS: 'retrieve-products',
  CREATE_PRODUCT: 'create-product',

  SYNC_ORDERS: 'sync-orders',
  GET_ORDERS: 'retrieve-orders',
  GET_ORDER: 'retrieve-order-details',

  SYNC_STORE: 'sync-store',
  GET_STORES: 'retrieve-stores',
  GET_STORE: 'retrieve-store',
  SYNC_STORE_LOCATIONS: 'sync-store-locations',
  GET_STORE_LOCATIONS: 'retrieve-store-locations',

  SYNC_CUSTOMERS: 'sync-customers',
  GET_CUSTOMERS: 'retrieve-customers',

  GET_USERS: 'retrieve-users',
  CREATE_USER: 'create-user',
  UPDATE_STORE_TOKEN: 'update-store-token',

  CONFIGURE_WEBHOOKS: 'configure-webhooks',
} as const;

export type JobRegistry = {
  [JOB_TYPES.SYNC_PRODUCTS]: {
    queue: typeof QUEUES.PRODUCTS;
    data: { store: Store };
    result: void;
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
  [JOB_TYPES.SYNC_STORE]: {
    queue: typeof QUEUES.STORES;
    data: { storeId: number };
    result: void;
  };
  [JOB_TYPES.GET_STORE]: {
    queue: typeof QUEUES.STORES;
    data: { storeId: number };
    result: Store;
  };
  [JOB_TYPES.GET_STORES]: {
    queue: typeof QUEUES.STORES;
    data: { userId: number };
    result: Store[];
  };
  [JOB_TYPES.SYNC_STORE_LOCATIONS]: {
    queue: typeof QUEUES.STORES;
    data: { store: number | Store };
    result: StoreLocations[] | null;
  };
  [JOB_TYPES.GET_STORE_LOCATIONS]: {
    queue: typeof QUEUES.STORES;
    data: { storeId: number };
    result: StoreLocations[];
  };
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
  [JOB_TYPES.GET_USERS]: {
    queue: typeof QUEUES.USERS;
    data: { storeId: number };
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
};
export type JobType = keyof JobRegistry;
export type QueueName = JobRegistry[JobType]['queue'];
export const jobToQueueMap: { [K in JobType]: QueueName } = {
  [JOB_TYPES.CONFIGURE_WEBHOOKS]: QUEUES.CONFIGURE,
  [JOB_TYPES.SYNC_PRODUCTS]: QUEUES.PRODUCTS,
  [JOB_TYPES.CREATE_PRODUCT]: QUEUES.PRODUCTS,
  [JOB_TYPES.CREATE_USER]: QUEUES.USERS,
  [JOB_TYPES.SYNC_CUSTOMERS]: QUEUES.CUSTOMERS,
  [JOB_TYPES.SYNC_STORE]: QUEUES.STORES,
  [JOB_TYPES.SYNC_STORE_LOCATIONS]: QUEUES.STORES,
  [JOB_TYPES.SYNC_ORDERS]: QUEUES.ORDERS,
  [JOB_TYPES.GET_STORES]: QUEUES.STORES,
  [JOB_TYPES.GET_STORE]: QUEUES.STORES,
  [JOB_TYPES.GET_STORE_LOCATIONS]: QUEUES.STORES,
  [JOB_TYPES.GET_ORDER]: QUEUES.ORDERS,
  [JOB_TYPES.GET_ORDERS]: QUEUES.ORDERS,
  [JOB_TYPES.GET_USERS]: QUEUES.USERS,
  [JOB_TYPES.GET_CUSTOMERS]: QUEUES.CUSTOMERS,
  [JOB_TYPES.GET_PRODUCTS]: QUEUES.PRODUCTS,
  [JOB_TYPES.UPDATE_STORE_TOKEN]: QUEUES.STORES,
  // Add other mappings...
};
export type QueueJobTypes<Q extends QueueName> = {
  [K in JobType]: JobRegistry[K]['queue'] extends Q ? K : never;
}[JobType];
export type QueueData<Q extends QueueName> = JobRegistry[QueueJobTypes<Q>]['data'];
export type QueueResult<Q extends QueueName> = JobRegistry[QueueJobTypes<Q>]['result'];
