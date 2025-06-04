import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataService } from './data/data.service';
import { JobsService } from './jobs/jobs.service';

@Injectable()
export class StartupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StartupService.name);

  constructor(
    private readonly dataService: DataService,
    private readonly jobsService: JobsService,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Running one-time startup task...');
    await this.runStartupTask();
  }

  private async runStartupTask() {
    try {
      await this.dataService.getProductCategorySyncStatus().then(value => {
        if (value == false || value == null || value == undefined) {
          this.jobsService.cacheProductTypes();
        }
      })
      this.logger.log('Startup task completed successfully');
    } catch (error) {
      this.logger.error(`Startup task failed: ${error.message}`, error.stack);
    }
  }
}
