import { OnQueueEvent, QueueEventsHost, QueueEventsListener } from "@nestjs/bullmq";
import { CUSTOMERS_QUEUE } from "../constants/jobs.constants";
import { Job } from "bullmq";




@QueueEventsListener(CUSTOMERS_QUEUE)
export class CustomersQueueEvents extends QueueEventsHost
{
    @OnQueueEvent('completed')
    onCompleted(job:Job)
    {
        return job;
    }
}