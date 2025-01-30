import { Processor, WorkerHost } from "@nestjs/bullmq";
import { CONFIGURE_QUEUE } from "../constants/jobs.constants";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Store } from "src/entities/store.entity";
import { Repository } from "typeorm";
import { UtilsService } from "src/utils/utils.service";
import { AxiosHeaders } from "axios";


@Processor(CONFIGURE_QUEUE)
export class ConfigWebhookConsumer extends WorkerHost {

    constructor(
        private readonly utilsService: UtilsService,
        @InjectRepository(Store)
        private readonly storesRepository: Repository<Store>
    ) { 
        super()
    }

    private readonly logger = new Logger(ConfigWebhookConsumer.name);

    public process = async(job : Job<unknown>): Promise<any> => {
        
        const storeId = job.data['storeId'];

        const store = await this.storesRepository.findOneBy({ 'table_id': storeId });
        const endpoint = this.utilsService.getShopifyURLForStore('webhooks.json', store);
        const headers = new AxiosHeaders().set('Content-Type', 'application/json').set('X-Shopify-Access-Token', store.access_token);

        //console.log(job);

        this.logger.debug(JSON.stringify(job));
    }
}