import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JobsService } from './jobs.service';
import { CONFIGURE_QUEUE, ORDERS_QUEUE, PRODUCTS_QUEUE, STORES_QUEUE } from './constants/jobs.constants';
import { ConfigWebhookConsumer } from './consumers/config-webhoook.consumer';
import { JobsController } from './jobs.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Store } from 'src/entities/store.entity';
import { UtilsModule } from 'src/utils/utils.module';
import { Product } from 'src/entities/product.entities';
import { GetProductsConsumer } from './consumers/get-products.consumer';
import { Order } from 'src/entities/order.entity';
import { GetOrdersConsumer } from './consumers/get-orders.consumer';

@Module({

  imports: [
    UtilsModule,
    TypeOrmModule.forFeature([Store, Product, Order]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      
      useFactory: async (configService : ConfigService) => ({
      connection: {
        host: configService.get<string>('redis.host'),
        port:  configService.get<number>('redis.port'),
        }
      })

    }),
     BullModule.registerQueueAsync(
       { name: CONFIGURE_QUEUE },
       { name: PRODUCTS_QUEUE },
       { name: ORDERS_QUEUE },
       { name: STORES_QUEUE }
     )
  ],

  providers: [JobsService, ConfigWebhookConsumer, GetProductsConsumer, GetOrdersConsumer],
  controllers: [JobsController],
  exports: [JobsService]
})
export class JobsModule {}
