import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job, Queue, QueueEvents } from 'bullmq';
import {
  CONFIGURE_QUEUE,
  CREATE_USER,
  CUSTOMERS_QUEUE,
  GET_CUSTOMERS,
  GET_ORDER,
  GET_ORDERS,
  GET_PRODUCTS,
  GET_STORE,
  GET_STORE_LOCATIONS,
  GET_USERS,
  ORDERS_QUEUE,
  PRODUCTS_QUEUE,
  STORES_QUEUE,
  SYNC_CUSTOMERS,
  SYNC_ORDERS,
  SYNC_PRODUCTS,
  SYNC_STORE_LOCATIONS,
  UPDATE_STORE_TOKEN,
  USERS_QUEUE,
} from './constants/jobs.constants';
import { Store } from 'src/database/entities/store.entity';
import { Order } from 'src/database/entities/order.entity';
import { UserStore } from 'src/database/entities/userstore.entity';
import { RegisterUserDto } from 'src/web-app/dtos/register-member.dto';
import { Product } from 'src/database/entities/product.entity';
import { StoreLocations } from 'src/database/entities/storeLocations.entity';

@Injectable()
export class JobsService {
  private ordersQueueEvents = new QueueEvents(ORDERS_QUEUE);
  private customersQueueEvents = new QueueEvents(CUSTOMERS_QUEUE);
  private productsQueueEvents = new QueueEvents(PRODUCTS_QUEUE);
  private storeQueueEvents = new QueueEvents(STORES_QUEUE);
  private userQueueEvents = new QueueEvents(USERS_QUEUE);
  constructor(
    @InjectQueue(CONFIGURE_QUEUE) private configQueue: Queue,
    @InjectQueue(PRODUCTS_QUEUE) private productQueue: Queue,
    @InjectQueue(ORDERS_QUEUE) private ordersQueue: Queue,
    @InjectQueue(CUSTOMERS_QUEUE) private customersQueue: Queue,
    @InjectQueue(STORES_QUEUE) private storesQueue: Queue,
    @InjectQueue(USERS_QUEUE) private usersQueue: Queue,
    //@InjectQueue('token-refresh-queue') private tokenRefreshQueue: Queue,
  ) { }

  public configure = async (storeId: number): Promise<any> => {
    await this.configQueue.add(CONFIGURE_QUEUE, storeId);
  };

  /**
   * All jobs regarding products
   * @param store
   */
  public syncProducts = async (store: Store): Promise<any> => {
    await this.productQueue.add(SYNC_PRODUCTS, store);
  };

  public getProducts = async (store: Store | number): Promise<Product[]> => {

    const job: Job<Store | number, Product[]> = await this.productQueue.add(GET_PRODUCTS, store, { attempts: 3 });

    const data: Product[] = await job.waitUntilFinished(this.productsQueueEvents, 30000);
    //console.log(data);
    return data;
  };

  /**
   * 
   * @param store
   */
  public syncOrders = async (store: Store): Promise<any> => {
    const job: Job<Store, any> = await this.ordersQueue.add(SYNC_ORDERS, store, { attempts: 3 });

    try {
      const result = await job.waitUntilFinished(this.ordersQueueEvents, 30000);

      console.log(result);
      console.log(await job.isFailed());
    } catch (error) {
      // console.log(error);
      if (error.message == '401') {
        console.log(await job.isFailed());
        //job.moveToFailed(error, job.token)
        //job.remove();
        return {
          status: 'AUTH_REQUIRED',
          shopDomain: job.data.myshopify_domain,

        }
      }
    }
  };
  public getOrders = async (store: number): Promise<Order[]> => {
    //const queueEvents = new QueueEvents(ORDERS_QUEUE);
    const job = await this.ordersQueue.add(GET_ORDERS, store, { attempts: 3 });
    return await job.waitUntilFinished(this.ordersQueueEvents, 30000);
  };
  public getOrder = async (orderId: number): Promise<Order> => {
    const job = await this.ordersQueue.add(GET_ORDER, orderId, { attempts: 3 });

    return await job.waitUntilFinished(this.ordersQueueEvents, 30000);
  };

  public syncCustomers = async (store: Store): Promise<any> => {
    const job = await this.customersQueue.add(SYNC_CUSTOMERS, store);

    return job;
  };
  public getCustomers = async (store: number): Promise<any> => {
    const job = await this.customersQueue.add(GET_CUSTOMERS, store, {
      attempts: 3,
    });

    return await job.waitUntilFinished(this.customersQueueEvents, 30000);
  };

  public getStore = async (storeId: number): Promise<any> => {
    const job = await this.storesQueue.add(GET_STORE, storeId, { attempts: 3 });
    return await job.waitUntilFinished(this.storeQueueEvents, 30000);
  };
  public updateStoreToken = async (store: Store, accessToken: string): Promise<boolean> => {
    const job: Job<Store, boolean> = await this.storesQueue.add(UPDATE_STORE_TOKEN, { store, accessToken }, { attempts: 3 });

    return await job.waitUntilFinished(this.storeQueueEvents, 30000);
  }
  public syncStoreLocations = async (store: number | Store): Promise<StoreLocations[]> => {

    const job: Job<number | Store, StoreLocations[]> = await this.storesQueue.add(SYNC_STORE_LOCATIONS, store, { attempts: 3 });
    return await job.waitUntilFinished(this.storeQueueEvents, 30000);
  }
  public getStoreLocations = async (storeId: number): Promise<StoreLocations[]> => {
    const job: Job<number, StoreLocations[]> = await this.storesQueue.add(GET_STORE_LOCATIONS, storeId, { attempts: 3 });

    return await job.waitUntilFinished(this.storeQueueEvents, 30000);
  };
  public getMembers = async (storeId: number): Promise<UserStore[]> => {
    const job = await this.usersQueue.add(GET_USERS, storeId, { attempts: 3 });
    return await job.waitUntilFinished(this.userQueueEvents, 30000);

  }
  public createMember = async (newMember: RegisterUserDto, storeId: number): Promise<UserStore> => {
    const job = await this.usersQueue.add(CREATE_USER, { storeId: storeId, newMember: newMember }, { attempts: 3 });
    return await job.waitUntilFinished((this.userQueueEvents), 30000);
  }

  private refreshToken = async (info: { store: Store, failedJobId?: string, queueName?: string }): Promise<Store> => {

    const job: Job<typeof info, Store> = await this.storesQueue.add(UPDATE_STORE_TOKEN, info, { attempts: 3, backoff: { type: 'exponential', delay: 3000 } });

    return await job.waitUntilFinished(this.storeQueueEvents, 30000);

  }


  private handleMutationOrSyncJobs = async (job: Job, result: any): Promise<any> => {

    if (result?.status === 'AUTH_REQUIRED') {

    }
  }
}
