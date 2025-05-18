import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job, Queue, QueueEvents } from 'bullmq';
import {
  JOB_TYPES,
  JobRegistry,
  jobToQueueMap,
  JobType,
  QueueData,
  QueueName,
  QueueResult,
  QUEUES,
} from './constants/jobs.constants';
import { Store } from 'src/database/entities/store.entity';
import { RegisterUserDto } from 'src/web-app/dtos/register-member.dto';
import { newProductDto } from 'src/web-app/dtos/new-product.dto';

@Injectable()
export class JobsService {
  private queues: Record<QueueName, Queue>;
  private queueEventsMap: Record<string, QueueEvents> = {};

  constructor(
    @InjectQueue(QUEUES.CONFIGURE)
    private configQueue: Queue<QueueData<typeof QUEUES.CONFIGURE>, QueueResult<typeof QUEUES.CONFIGURE>>,
    @InjectQueue(QUEUES.PRODUCTS)
    private productQueue: Queue<QueueData<typeof QUEUES.PRODUCTS>, QueueResult<typeof QUEUES.PRODUCTS>>,
    @InjectQueue(QUEUES.ORDERS)
    private ordersQueue: Queue<QueueData<typeof QUEUES.ORDERS>, QueueResult<typeof QUEUES.ORDERS>>,
    @InjectQueue(QUEUES.CUSTOMERS)
    private customersQueue: Queue<QueueData<typeof QUEUES.CUSTOMERS>, QueueResult<typeof QUEUES.CUSTOMERS>>,
    @InjectQueue(QUEUES.STORES)
    private storesQueue: Queue<QueueData<typeof QUEUES.STORES>, QueueResult<typeof QUEUES.STORES>>,
    @InjectQueue(QUEUES.USERS)
    private usersQueue: Queue<QueueData<typeof QUEUES.USERS>, QueueResult<typeof QUEUES.USERS>>,
  ) {
    this.queues = {
      [QUEUES.PRODUCTS]: this.productQueue,
      [QUEUES.CONFIGURE]: this.configQueue,
      [QUEUES.ORDERS]: this.ordersQueue,
      [QUEUES.USERS]: this.usersQueue,
      [QUEUES.STORES]: this.storesQueue,
      [QUEUES.CUSTOMERS]: this.customersQueue,
    };

    // Initialize queue events
    Object.keys(this.queues).forEach(queueName => {
      this.queueEventsMap[queueName] = new QueueEvents(queueName);
    });
  }
  async addJob<T extends JobType>(
    type: T,
    data: JobRegistry[T]['data'],
    opts?: { attempts: 3 },
  ): Promise<JobRegistry[T]['result']> {
    const queueName = jobToQueueMap[type];
    const queue = this.queues[queueName];
    const event = this.queueEventsMap[queueName];
    const job = await queue.add(type, data, opts);

    try {
      const result = (await job.waitUntilFinished(event, 30000)) as Promise<JobRegistry[T]['result']>;
      return result;
    } catch (error) {
      if (error.message == '401') {
        console.log(await job.isFailed());
        //job.moveToFailed(error, job.token)
        //job.remove();
        return {
          status: 'AUTH_REQUIRED',
          shopDomain: job.data.myshopify_domain,
        };
      }
    }
  }
  public configure = async (storeId: number) => await this.addJob(JOB_TYPES.CONFIGURE_WEBHOOKS, { storeId: storeId });
  public syncProducts = async (store: Store) => await this.addJob(JOB_TYPES.SYNC_PRODUCTS, { store: store });
  public getProducts = async (store: Store | number) => await this.addJob(JOB_TYPES.GET_PRODUCTS, { store: store });
  public syncOrders = async (store: Store) => await this.addJob(JOB_TYPES.SYNC_ORDERS, { store: store });
  public getOrders = async (store: number) => await this.addJob(JOB_TYPES.GET_ORDERS, { storeId: store });
  public getOrder = async (orderId: number) => await this.addJob(JOB_TYPES.GET_ORDER, { orderId: orderId });
  public syncCustomers = async (store: Store) => await this.addJob(JOB_TYPES.SYNC_CUSTOMERS, { store: store });
  public getCustomers = async (store: number) => this.addJob(JOB_TYPES.GET_CUSTOMERS, { storeId: store });
  public getStore = async (storeId: number) => this.addJob(JOB_TYPES.GET_STORE, { storeId: storeId });
  public updateStoreToken = async (store: Store, accessToken: string) =>
    await this.addJob(JOB_TYPES.UPDATE_STORE_TOKEN, { store: store, accessToken: accessToken });
  public syncStoreLocations = async (store: number | Store) =>
    await this.addJob(JOB_TYPES.SYNC_STORE_LOCATIONS, { store: store });
  public getStoreLocations = async (storeId: number) =>
    await this.addJob(JOB_TYPES.GET_STORE_LOCATIONS, { storeId: storeId });
  public getMembers = async (storeId: number) => await this.addJob(JOB_TYPES.GET_USERS, { storeId: storeId });
  public createMember = async (newMember: RegisterUserDto, storeId: number) =>
    await this.addJob(JOB_TYPES.CREATE_USER, { user: newMember, storeId: storeId });
  public createProduct = async (store: Store, product: newProductDto) =>
    await this.addJob(JOB_TYPES.CREATE_PRODUCT, { product: product, store: store });

  public syncProductTypes = async (store: Store) => await this.addJob(JOB_TYPES.SYNC_PRODUCT_TYPES, { store: store });
  public getProductTypes = async (id?: string) => await this.addJob(JOB_TYPES.GET_PRODUCT_TYPES, { id: id });
  public getProductTypesNames = async (level: number) =>
    await this.addJob(JOB_TYPES.GET_PRODUCT_TYPE_NAMES, { level: level });
}
