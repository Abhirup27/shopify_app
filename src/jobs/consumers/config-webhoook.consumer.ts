import { Processor, WorkerHost } from "@nestjs/bullmq";
import { CONFIGURE_QUEUE } from "../constants/jobs.constants";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Store } from "src/entities/store.entity";
import { Repository } from "typeorm";
import { UtilsService } from "src/utils/utils.service";
import { AxiosHeaders } from "axios";
import { ConfigService } from "@nestjs/config";
import { ShopifyResponse } from "src/types/ShopifyResponse";
import { ShopifyRequestOptions } from "src/types/ShopifyRequestOptions";
import { request } from "express";


@Processor(CONFIGURE_QUEUE)
export class ConfigWebhookConsumer extends WorkerHost {

    constructor(
        private readonly configService: ConfigService,
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

        let requestOptions: ShopifyRequestOptions = { url: null, headers: null };
        //console.log(store.access_token)
        requestOptions.headers =  new AxiosHeaders().set('Content-Type', 'application/json').set('X-Shopify-Access-Token', store.access_token);

        requestOptions.url = await this.utilsService.getShopifyURLForStore('webhooks.json', store);

        //const endpoint = this.utilsService.getShopifyURLForStore('webhooks.json', store);
        //const headers = new AxiosHeaders().set('Content-Type', 'application/json').set('X-Shopify-Access-Token', store.access_token);
        const webhooks_config: string[] = this.configService.get('webhooks');
        console.log(webhooks_config)
        webhooks_config.forEach(async (element) => {
            
            const body = {
                webhook: {
                    topic: element,
                    address: this.configService.get<string>('app_url') + `/webhook/${element}`,
                    format: 'json'
                }
            };

            requestOptions.data = body;

            const response: ShopifyResponse = await this.utilsService.requestToShopify('post', requestOptions);
            this.logger.debug(`Response for topic ${element} : ${JSON.stringify( response.respBody)}`)

        });

        this.logger.debug(JSON.stringify(job));
    }
}