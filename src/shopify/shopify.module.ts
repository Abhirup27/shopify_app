import { Module } from '@nestjs/common';
import { ShopifyBillingModule } from './shopify-billing/shopify-billing.module';
import { ShopifyAuthModule } from './shopify-auth/shopify-auth.module';
import { ShopifyWebhooksModule } from './shopify-webhooks/shopify-webhooks.module';

@Module({
  imports: [
    ShopifyBillingModule,
    ShopifyAuthModule,
    ShopifyWebhooksModule
  ],
  exports: [ShopifyBillingModule, ShopifyAuthModule, ShopifyWebhooksModule],
})
export class ShopifyModule {}
