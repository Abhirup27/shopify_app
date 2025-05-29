import { OnQueueEvent, QueueEventsHost, QueueEventsListener } from '@nestjs/bullmq';
import { QUEUES } from '../constants/jobs.constants';
import { Job } from 'bullmq';

@QueueEventsListener(QUEUES.PRODUCTS)
export class ProductsQueueEvents extends QueueEventsHost {
  @OnQueueEvent('active')
  onActive() {
    console.log('hello');
  }

  @OnQueueEvent('completed')
  onCompleted(job: Job) {
    console.log('hello3');
    return job;
  }

  @OnQueueEvent('failed')
  async handleFailedJob(job: Job, error: Error) {
    console.log('yes3');
    console.log(error);
    if (error['isTokenExpired']) {
      console.log('yes2');
      const { shop, jobId } = error['meta'];

      // Pause job and notify main module
      await job.updateData({
        ...job.data,
        paused: true,
        pausedAt: new Date(),
      });

      // Move to custom "paused" state
      await job.moveToFailed(error, jobId, true);

      // Emit global event
      /* this.eventEmitter.emit('token_expired', {
         shop,
         jobId,
         queue: job.queueName
       }); */
    }
  }
}
