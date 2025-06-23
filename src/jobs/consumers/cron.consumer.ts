import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { DataService } from '../../data/data.service';
import { JOB_TYPES, JobRegistry, QUEUES } from '../constants/jobs.constants';
import { Job } from 'bullmq';
import { StorePlan } from '../../database/entities/storePlans.entity';
import { print } from 'graphql';
import { GetSubscriptionStateDocument, GetSubscriptionStateQuery } from '../../generated/graphql';
import { ConfigService } from '@nestjs/config';
import { ShopifyRequestOptions } from '../../utils/types/ShopifyRequestOptions';
import { UtilsService } from '../../utils/utils.service';
import { AxiosHeaders } from 'axios';
import { Store } from '../../database/entities/store.entity';
import { CacheService } from '../../data/cache/cache.service';

type CronQueueJobName = typeof JOB_TYPES.SUBSCRIPTION_STATUS | typeof JOB_TYPES.CHECK_PENDING_PAYMENTS;
type CronQueueJob = {
  [K in CronQueueJobName]: Job<JobRegistry[K]['data'], JobRegistry[K]['result']> & { name: K };
}[CronQueueJobName];

@Processor(QUEUES.CRON, { concurrency: 10 })
export class CronConsumer extends WorkerHost {
  private readonly logger = new Logger(CronConsumer.name);

  private readonly getSubscription: string = print(GetSubscriptionStateDocument);

  constructor(
    private readonly cacheService: CacheService,
    private readonly dataService: DataService,
    private readonly config: ConfigService,
    private readonly utilsService: UtilsService,
  ) {
    super();
  }

  public process = async (job: CronQueueJob): Promise<JobRegistry[CronQueueJobName]['result']> => {
    try {
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
  ): Promise<JobRegistry[CronQueueJobName]['result']> {}

  private async checkPendingSubPay(
    data: JobRegistry[CronQueueJobName]['data'],
  ): Promise<JobRegistry[CronQueueJobName]['result']> {
    const pendingSubsBilling = await this.dataService.getPendingSubs();

    if (pendingSubsBilling === null) return;

    let pendingDB: StorePlan[];
    const chargeIds = Object.keys(pendingSubsBilling);

    if (chargeIds.length === 0) return;
    pendingDB = await this.dataService.getAllPendingSubs(chargeIds);
    const dbChargeIds = new Set(pendingDB.map(record => record.last_charge_id));

    // const toRemoveFromCache: string[] = [];
    //const shopifyQueries: Promise<void>[] = [];

    // Process each charge ID in cache
    for (const chargeId of chargeIds) {
      const isInDB = dbChargeIds.has(chargeId);

      if (!isInDB) {
        // Remove from cache if not in DB as pending, meaning somewhere in between, this record got updated by a webhook

        //toRemoveFromCache.push(chargeId);
        await this.dataService.deletePendingSub(chargeId);
        continue;
      }

      const currentValue = pendingSubsBilling[chargeId];
      const numericValue = parseInt(currentValue, 10) || 0;

      if (numericValue != 0 && numericValue % 3 === 0) {
        const storePlan = pendingDB.find(storePlan => storePlan.last_charge_id == chargeId);
        const store: Store = storePlan.store;
        // send a query to shopify every 3rd attempt to check for it's status.
        const request: ShopifyRequestOptions = {
          url: this.utilsService.getShopifyURLForStore('graphql.json', store),
          headers: new AxiosHeaders()
            .set('Content-Type', 'application/json')
            .set('X-Shopify-Access-Token', store.access_token),
          data: { query: this.getSubscription, variables: { apiKey: this.config.get<string>('shopify_api_key') } },
        };

        const response = await this.utilsService.requestToShopify<GetSubscriptionStateQuery>('post', request);

        if (response.statusCode === 200) {
          //if(response.respBody.appByKey.installation.activeSubscriptions)
          if (response.respBody.appByKey.installation.activeSubscriptions[0].status != storePlan.status) {
            if (
              response.respBody.appByKey.installation.activeSubscriptions[0].status == 'ACTIVE' ||
              response.respBody.appByKey.installation.activeSubscriptions[0].status == 'ACCEPTED'
            ) {
              //check charge id before setting credits
              storePlan.credits += (await this.dataService.getPlans())[storePlan.plan_id - 1].credits;
              console.log(storePlan.credits);
            }
            storePlan.status = response.respBody.appByKey.installation.activeSubscriptions[0].status;
            await this.dataService.updatePlan(storePlan);
            await this.dataService.deletePendingSub(chargeId);
            if (await this.cacheService.has(`${store.id}-credits`)) {
              const lock = await this.dataService.getStoreCreditsLock(store.id);
              if (lock != undefined) {
                await this.cacheService.set(`${store.id}-credits`, storePlan.credits, 0);
              }
              lock.release();
            }
          }
        }
      } else {
        const newValue = numericValue + 1;
        //console.log('newValue', newValue);
        pendingSubsBilling[chargeId] = newValue.toString();
        await this.dataService.setPendingSubs(chargeId, pendingSubsBilling[chargeId]);
      }
    }
  }
}
