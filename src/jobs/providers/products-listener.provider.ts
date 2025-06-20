import { OnQueueEvent, QueueEventsHost, QueueEventsListener } from '@nestjs/bullmq';
import { QUEUES } from '../constants/jobs.constants';
import { Job } from 'bullmq';

@QueueEventsListener(QUEUES.PRODUCTS)
export class ProductsQueueEvents extends QueueEventsHost {
  @OnQueueEvent('active')
  onActive() {
   console.log('New products job in queue');
  }

  @OnQueueEvent('completed')
  onCompleted(job: Job) {
    console.log('Product Job completed');
    return job;
  }

  @OnQueueEvent('failed')
  async handleFailedJob(args: any, id: string) {
    console.log('Product Job failed');
    console.log(args);
    //if (error['isTokenExpired']) {
    // console.log('yes2');
    // const { shop, jobId } = error['meta'];

    // Pause job and notify main module
    //await job.updateData({
    // ...job.data,
    // paused: true,
    // pausedAt: new Date(),
    //});

    // Move to custom "paused" state
    //await job.moveToFailed(error, job.token, true);

    // Emit global event
    /* this.eventEmitter.emit('token_expired', {
       shop,
       jobId,
       queue: job.queueName
     }); */
    //}
  }
  
  @OnQueueEvent('delayed')
  async handleDelayed(args:any, id: any)
  {
  console.log(args);
  }

    /* @OnWorkerEvent('failed')
   async handleFailedJob(job: Job, error: Error) {
     console.log(error);
     //console.log(job.data);
     if (error['isTokenExpired']) {
       console.log('true');
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
        }); 
     }
   } */

}
