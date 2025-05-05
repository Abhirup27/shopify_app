import { OnQueueEvent, QueueEventsHost, QueueEventsListener } from '@nestjs/bullmq';
import { QUEUES } from '../constants/jobs.constants';
import { Job } from 'bullmq';

@QueueEventsListener(QUEUES.CUSTOMERS)
export class CustomersQueueEvents extends QueueEventsHost {
  @OnQueueEvent('completed')
  onCompleted(job: Job) {
    return job;
  }
}
