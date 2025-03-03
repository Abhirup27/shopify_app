import { OnQueueEvent, QueueEventsHost, QueueEventsListener } from "@nestjs/bullmq";
import { PRODUCTS_QUEUE } from "../constants/jobs.constants";
import { Job } from "bullmq";


@QueueEventsListener(PRODUCTS_QUEUE)
export class ProductsQueueEvents extends QueueEventsHost
{
    @OnQueueEvent('completed')
    onCompleted(job:Job)
    {
        return job;
    }
}