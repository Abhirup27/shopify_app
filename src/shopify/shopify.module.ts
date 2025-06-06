import { Module } from '@nestjs/common';
import { ShopifyBillingModule } from './shopify-billing/shopify-billing.module';
import { ShopifyAuthModule } from './shopify-auth/shopify-auth.module';
import { RouterModule } from '@nestjs/core';

@Module({
  imports: [
    ShopifyBillingModule,
    ShopifyAuthModule,
  ],
  exports: [ShopifyBillingModule, ShopifyAuthModule],
})
export class ShopifyModule {}
