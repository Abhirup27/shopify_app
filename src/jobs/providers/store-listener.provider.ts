import { OnQueueEvent, QueueEventsHost, QueueEventsListener } from "@nestjs/bullmq";
import { STORES_QUEUE } from "../constants/jobs.constants";
import { Job } from "bullmq";


@QueueEventsListener(STORES_QUEUE)
export class StoresQueueEvents extends QueueEventsHost {
    @OnQueueEvent('completed')
    onCompleted(job: Job) {
        return job;
    }
}