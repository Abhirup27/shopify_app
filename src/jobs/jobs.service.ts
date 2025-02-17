import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { CONFIGURE_QUEUE, PRODUCTS_QUEUE } from './constants/jobs.constants';
import { Store } from 'src/entities/store.entity';

@Injectable()
export class JobsService {
    constructor
        (
        @InjectQueue(CONFIGURE_QUEUE) private configQueue: Queue,
        @InjectQueue(PRODUCTS_QUEUE) private productQueue: Queue
    )
    {}

    public configure = async (storeId: number): Promise<any> =>
    {
        await this.configQueue.add(CONFIGURE_QUEUE, storeId)
    }

    public getProducts = async (store: Store): Promise<any> =>
    {
        await this.productQueue.add(PRODUCTS_QUEUE, store);
    }
}
