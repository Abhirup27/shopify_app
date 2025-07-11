import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JobsService } from './jobs.service';
import { QUEUES } from './constants/jobs.constants';
import { ConfigWebhookConsumer } from './consumers/config-webhoook.consumer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Store } from 'src/database/entities/store.entity';
import { UtilsModule } from 'src/utils/utils.module';
import { Product } from 'src/database/entities/product.entity';
import { ProductsConsumer } from './consumers/products.consumer';
import { Order } from 'src/database/entities/order.entity';
import { OrdersConsumer } from './consumers/orders.consumer';
import { OrdersQueueEvents } from './providers/order-listener.provider';
import { ProductsQueueEvents } from './providers/products-listener.provider';
import { CustomersConsumer } from './consumers/customers.consumer';
import { Customer } from 'src/database/entities/customer.entity';
import { CustomersQueueEvents } from './providers/retrieve-customers-listener';
import { StoresQueueEvents } from './providers/store-listener.provider';
import { StoresConsumer } from './consumers/store.consumer';
import { UserStore } from 'src/database/entities/userstore.entity';
import { User } from 'src/database/entities/user.entity';
import { UsersConsumer } from './consumers/users.consumer';
import { UsersQueueEvents } from './providers/user-listener.provider';
import { AuthModule } from 'src/auth/auth.module';
import { StoreLocations } from 'src/database/entities/storeLocations.entity';
import { ProductType } from 'src/database/entities/productType.entity';
import { RedisModule } from '@nestjs-modules/ioredis';

import { ProductVariant } from 'src/database/entities/productVariant.entity';
import { Queue } from 'bullmq';
import { DataModule } from 'src/data/data.module';
import { CronConsumer } from './consumers/cron.consumer';
import { StorePlan } from '../database/entities/storePlans.entity';
import { CacheModule } from '../data/cache/cache.module';

@Module({
  imports: [
    CacheModule,
    DataModule,
    UtilsModule,
    AuthModule,
    TypeOrmModule.forFeature([
      Store,
      Product,
      ProductType,
      ProductVariant,
      Order,
      Customer,
      UserStore,
      User,
      StoreLocations,
      StorePlan,
    ]),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
        },
      }),
    }),
    BullModule.registerQueueAsync(
      { name: QUEUES.CONFIGURE },
      { name: QUEUES.PRODUCTS },
      { name: QUEUES.ORDERS },
      { name: QUEUES.STORES },
      { name: QUEUES.CUSTOMERS },
      { name: QUEUES.USERS },
      { name: QUEUES.CRON },
    ),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory:  (configService: ConfigService) => ({
        type: 'single',
        //url: configService.get<string>('REDIS_URL'),
        url: `redis://${configService.get<string>('redis.host')}:${configService.get<number>('redis.port')}`,
      }),
    }),
  ],

  providers: [
    {
      inject: [ConfigService],
      provide: 'BullQueue_PAUSED_QUEUE',
      useFactory: configService =>
        new Queue('PAUSED_QUEUE', {
          connection: {
            url: `redis://${configService.get('redis.host')}:${configService.get('redis.port')}`,
          },
        }),
    },
    JobsService,
    ConfigWebhookConsumer,
    ProductsConsumer,
    OrdersConsumer,
    CustomersConsumer,
    StoresConsumer,
    UsersConsumer,
    CronConsumer,

    OrdersQueueEvents,
    CustomersQueueEvents,
    StoresQueueEvents,
    UsersQueueEvents,
    ProductsQueueEvents,
  ],
  controllers: [],
  exports: [JobsService],
})
export class JobsModule {}
