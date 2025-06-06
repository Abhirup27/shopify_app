import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';

import { DataModule } from '../../data/data.module';

@Module({
  imports: [DataModule],
  controllers: [BillingController],
})
export class ShopifyBillingModule {}
