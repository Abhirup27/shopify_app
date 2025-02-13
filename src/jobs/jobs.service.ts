import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { CONFIGURE_QUEUE } from './constants/jobs.constants';

@Injectable()
export class JobsService {
    constructor(@InjectQueue(CONFIGURE_QUEUE) private configQueue: Queue)
    {}

    public configure = async (): Promise<any> =>
    {
        await this.configQueue.add(CONFIGURE_QUEUE, {storeId: 1})
    }
}
