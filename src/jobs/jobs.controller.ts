import { Controller, Get } from '@nestjs/common';
import { JobsService } from './jobs.service';

@Controller('jobs')
export class JobsController {
    constructor(private readonly jobsService : JobsService){}
    @Get('/configureWebhook')
    public async config()
    {
        return this.jobsService.configure(1);
    }
}
