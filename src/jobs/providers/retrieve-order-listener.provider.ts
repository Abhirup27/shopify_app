import { OnQueueEvent, QueueEventsHost, QueueEventsListener } from "@nestjs/bullmq";
import { ORDERS_QUEUE } from "../constants/jobs.constants";
import { Job } from "bullmq";


@QueueEventsListener(ORDERS_QUEUE)
export class OrdersQueueEvents extends QueueEventsHost {
    @OnQueueEvent('completed')
    onCompleted(job: Job) {
        return job;
    }
    @OnQueueEvent('error')
    onError(job: Job, err: Error) {
        //console.log(err);
        //job.moveToFailed(err, job.token);
    }

    @OnQueueEvent('failed')
    onFail(job: Job) {
        //console.log('failed')
        job.remove();
        return job;
    }

}
