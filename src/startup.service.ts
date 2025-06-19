import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataService } from './data/data.service';
import { JobsService } from './jobs/jobs.service';
import { CacheService } from './data/cache/cache.service';

@Injectable()
export class StartupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StartupService.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly jobsService: JobsService,
  ) {}

  onApplicationBootstrap() {
    this.runStartupTask();
  }

  private runStartupTask() {
    try {
      this.cacheService.get<boolean>('productCategorySyncStatus').then(value => {

        if (value == false || value == null || value == undefined) {
          this.jobsService.cacheProductTypes();
        }
      });
      this.logger.log('Startup tasks initiated.');
    } catch (error) {
      this.logger.error(`Startup task failed: ${error.message}`, error.stack);
    }
  }
}
