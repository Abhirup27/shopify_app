import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { DataModule } from '../../data/data.module';

@Module({
  imports: [DataModule],

    controllers: [WebhooksController],
})
export class ShopifyWebhooksModule { }
