import { Module } from '@nestjs/common';
import { join } from 'path';
import { WebhooksController } from './webhooks.controller';

@Module({
    imports: [ ],

    controllers: [WebhooksController],
})
export class ShopifyWebhooksModule { }
