import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue, QueueEvents } from 'bullmq';
import { CONFIGURE_QUEUE, CUSTOMERS_QUEUE, GET_CUSTOMERS, GET_ORDERS, GET_PRODUCTS, GET_STORE, ORDERS_QUEUE, PRODUCTS_QUEUE, STORES_QUEUE, SYNC_CUSTOMERS, SYNC_ORDERS, SYNC_PRODUCTS } from './constants/jobs.constants';
import { Store } from 'src/entities/store.entity';
import { Order } from 'src/entities/order.entity';

@Injectable()
export class JobsService {

    private ordersQueueEvents = new QueueEvents(ORDERS_QUEUE);
    private customersQueueEvents = new QueueEvents(CUSTOMERS_QUEUE);
    private productsQueueEvents = new QueueEvents(PRODUCTS_QUEUE);
    private storeQueueEvents = new QueueEvents(STORES_QUEUE);
    constructor
        (
            @InjectQueue(CONFIGURE_QUEUE) private configQueue: Queue,
            @InjectQueue(PRODUCTS_QUEUE) private productQueue: Queue,
            @InjectQueue(ORDERS_QUEUE) private ordersQueue: Queue,
            @InjectQueue(CUSTOMERS_QUEUE) private customersQueue: Queue,
            @InjectQueue(STORES_QUEUE) private storesQueue: Queue,

        ) { }

    public configure = async (storeId: number): Promise<any> => {
        await this.configQueue.add(CONFIGURE_QUEUE, storeId)
    }

    /**
     * All jobs regarding products
     * @param store 
     */
    public syncProducts = async (store: Store): Promise<any> => {
        await this.productQueue.add(SYNC_PRODUCTS, store);
    }

    public getProducts = async (store: Store): Promise<any> => {
        const job = await this.productQueue.add(GET_PRODUCTS, store, { attempts: 3 });

        return await job.waitUntilFinished(this.productsQueueEvents, 30000);
    }

    /**
     * All jobs regarding orders
     * @param store 
     */
    public syncOrders = async (store: Store): Promise<any> => {
        return await this.ordersQueue.add(SYNC_ORDERS, store, { attempts: 3 });

    }
    public getOrders = async (store: number): Promise<any> => {
        //const queueEvents = new QueueEvents(ORDERS_QUEUE);
        const job = await this.ordersQueue.add(GET_ORDERS, store, { attempts: 3 });
        return await job.waitUntilFinished(this.ordersQueueEvents, 30000);


    }


    public syncCustomers = async (store: Store): Promise<any> => {
        const job = await this.customersQueue.add(SYNC_CUSTOMERS, store);

        return job;
    }
    public getCustomers = async (store: number): Promise<any> => {
        const job = await this.customersQueue.add(GET_CUSTOMERS, store, { attempts: 3 });

        return await job.waitUntilFinished(this.customersQueueEvents, 30000);
    }


    public getStore = async (storeId: number): Promise<any> => {
        const job = await this.storesQueue.add(GET_STORE, storeId, { attempts: 3 });
        return await job.waitUntilFinished(this.storeQueueEvents, 30000);
    }
}
