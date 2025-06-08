import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { DataService } from '../../data/data.service';
import { JOB_TYPES, JobRegistry, QUEUES } from '../constants/jobs.constants';
import { Job } from 'bullmq';
import { StorePlan } from '../../database/entities/storePlans.entity';

type CronQueueJobName = typeof JOB_TYPES.SUBSCRIPTION_STATUS | typeof JOB_TYPES.CHECK_PENDING_PAYMENTS;
type CronQueueJob = {
  [K in CronQueueJobName]: Job<JobRegistry[K]['data'], JobRegistry[K]['result']> & {name: K};
}[CronQueueJobName];

@Processor(QUEUES.CRON, { concurrency: 10 })
export class CronConsumer extends WorkerHost {
  private readonly logger = new Logger(CronConsumer.name);

  constructor(
    private readonly dataService: DataService,
  ) {
    super();
  }

  public process = async(job: CronQueueJob): Promise<JobRegistry[CronQueueJobName]['result']> => {
    try{
      switch (job.name) {
        case JOB_TYPES.SUBSCRIPTION_STATUS:
          return await this.syncSubsStatus(job.data);
        case JOB_TYPES.CHECK_PENDING_PAYMENTS:
          return await this.checkPendingSubPay(job.data);
        default:
          throw new Error('invalid job');
      }
    } catch (error) {
      this.logger.error(error.message, error.stack);
    }
  };

  private async syncSubsStatus(
    data: JobRegistry[CronQueueJobName]['data'],
  ): Promise<JobRegistry[CronQueueJobName]['result']> {

  }

  private async checkPendingSubPay(
    data: JobRegistry[CronQueueJobName]['data'],
  ): Promise<JobRegistry[CronQueueJobName]['result']> {
    const pendingSubsBilling = this.dataService.getPendingSubs();
    if (pendingSubsBilling === null) return;

    let pendingDB: StorePlan[];
    const chargeIds = Object.keys(pendingSubsBilling);

    if (chargeIds.length === 0) return;
    pendingDB = await this.dataService.getAllPendingSubs(chargeIds);
    const dbChargeIds = new Set(pendingDB.map(record => record.last_charge_id));

    const toRemoveFromCache: string[] = [];
    const shopifyQueries: Promise<void>[] = [];

    // Process each charge ID in cache
    for (const chargeId of chargeIds) {
      const isInDB = dbChargeIds.has(chargeId);

      if (!isInDB) {
        // Remove from cache if not in DB as pending, meaning somewhere in between, this record got updated by a webhook
        toRemoveFromCache.push(chargeId);
        continue;
      }
      const currentValue = pendingSubsBilling[chargeId];
      const numericValue = parseInt(currentValue, 10) || 0;
      if (numericValue % 3 === 0) {
        // send a query to shopify every 3rd attempt to check for it's status.

      }
      const newValue = numericValue + 1;
      pendingSubsBilling[chargeId] = newValue.toString();
    }
  }
};