import { OnQueueEvent, QueueEventsHost, QueueEventsListener } from "@nestjs/bullmq";
import { USERS_QUEUE } from "../constants/jobs.constants";
import { Job } from "bullmq";



@QueueEventsListener(USERS_QUEUE)
export class UsersQueueEvents extends QueueEventsHost {
  @OnQueueEvent('completed')
  onCompleted(job: Job) {
    return job;
  }
}
