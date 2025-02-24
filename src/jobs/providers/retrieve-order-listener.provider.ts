import { OnQueueEvent, QueueEventsHost, QueueEventsListener } from "@nestjs/bullmq";
import { ORDERS_QUEUE } from "../constants/jobs.constants";
import { Job } from "bullmq";


@QueueEventsListener(ORDERS_QUEUE)
export class OrderQueueEvents extends QueueEventsHost
{
    @OnQueueEvent('completed')
    onCompleted(job:Job)
    {
        return job;
    }
}