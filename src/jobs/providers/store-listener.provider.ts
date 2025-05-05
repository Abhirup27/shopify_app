import { OnQueueEvent, QueueEventsHost, QueueEventsListener } from '@nestjs/bullmq';
import { QUEUES } from '../constants/jobs.constants';
import { Job } from 'bullmq';

@QueueEventsListener(QUEUES.STORES)
export class StoresQueueEvents extends QueueEventsHost {
  @OnQueueEvent('completed')
  onCompleted(job: Job) {
    return job;
  }

  @OnQueueEvent('error')
  onError(job: Job, err: Error) {
    console.log(err);
    job.moveToFailed(err, job.token);
  }

  @OnQueueEvent('failed')
  onFail(job: Job) {
    job.remove();
    return job;
  }
}
