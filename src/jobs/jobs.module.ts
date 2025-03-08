import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JobsService } from './jobs.service';
import { CONFIGURE_QUEUE, CUSTOMERS_QUEUE, ORDERS_QUEUE, PRODUCTS_QUEUE, STORES_QUEUE } from './constants/jobs.constants';
import { ConfigWebhookConsumer } from './consumers/config-webhoook.consumer';
import { JobsController } from './jobs.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Store } from 'src/entities/store.entity';
import { UtilsModule } from 'src/utils/utils.module';
import { Product } from 'src/entities/product.entities';
import { ProductsConsumer } from './consumers/products.consumer';
import { Order } from 'src/entities/order.entity';
import { OrdersConsumer } from './consumers/orders.consumer';
import { OrdersQueueEvents } from './providers/retrieve-order-listener.provider';
import { ProductsQueueEvents } from './providers/retrieve-products-listener.provider';
import { CustomersConsumer } from './consumers/customers.consumer';
import { Customer } from 'src/entities/customer.entity';
import { CustomersQueueEvents } from './providers/retrieve-customers-listener';
import { StoresQueueEvents } from './providers/store-listener.provider';
import { StoresConsumer } from './consumers/store.consumer';

@Module({

  imports: [
    UtilsModule,

    TypeOrmModule.forFeature([Store, Product, Order, Customer]),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
        }
      })

    }),
    BullModule.registerQueueAsync(
      { name: CONFIGURE_QUEUE },
      { name: PRODUCTS_QUEUE },
      { name: ORDERS_QUEUE },
      { name: STORES_QUEUE },
      { name: CUSTOMERS_QUEUE }
    )
  ],

  providers: [
    JobsService,
    ConfigWebhookConsumer,
    ProductsConsumer,
    OrdersConsumer,
    CustomersConsumer,
    StoresConsumer,

    OrdersQueueEvents,
    ProductsQueueEvents,
    CustomersQueueEvents,
    StoresQueueEvents,
  ],
  controllers: [JobsController],
  exports: [JobsService]
})
export class JobsModule { }
