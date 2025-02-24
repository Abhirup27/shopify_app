import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue, QueueEvents } from 'bullmq';
import { CONFIGURE_QUEUE, GET_ORDERS, GET_PRODUCTS, ORDERS_QUEUE, PRODUCTS_QUEUE, SYNC_ORDERS, SYNC_PRODUCTS } from './constants/jobs.constants';
import { Store } from 'src/entities/store.entity';
import { Order } from 'src/entities/order.entity';

@Injectable()
export class JobsService {
    private ordersQueueEvents = new QueueEvents(ORDERS_QUEUE);
    constructor
        (
        @InjectQueue(CONFIGURE_QUEUE) private configQueue: Queue,
        @InjectQueue(PRODUCTS_QUEUE) private productQueue: Queue,
        @InjectQueue(ORDERS_QUEUE) private ordersQueue: Queue
        
    )
    {}

    public configure = async (storeId: number): Promise<any> =>
    {
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
    await this.productQueue.add(GET_PRODUCTS, store);
    }

    /**
     * All jobs regarding orders
     * @param store 
     */
    public syncOrders = async (store: Store): Promise<any> =>
    {
        await this.ordersQueue.add(SYNC_ORDERS, store, {attempts: 3});
    }
    public getOrders = async (store: Store): Promise<any> =>
    {
        //const queueEvents = new QueueEvents(ORDERS_QUEUE);
        const job = await this.ordersQueue.add(GET_ORDERS, store, { attempts: 3 });
        return await job.waitUntilFinished(this.ordersQueueEvents, 30000);
    
        
    }
}
