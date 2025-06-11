import { Module } from '@nestjs/common';
import { join } from 'path';
import { WebhooksController } from './webhooks.controller';
import { DataModule } from '../../data/data.module';

@Module({
  imports: [ DataModule ],

    controllers: [WebhooksController],
})
export class ShopifyWebhooksModule { }
