import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JobsService } from './jobs.service';
import { CONFIGURE_QUEUE, CUSTOMERS_QUEUE, ORDERS_QUEUE, PRODUCTS_QUEUE, STORES_QUEUE, USERS_QUEUE } from './constants/jobs.constants';
import { ConfigWebhookConsumer } from './consumers/config-webhoook.consumer';
import { JobsController } from './jobs.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Store } from 'src/database/entities/store.entity';
import { UtilsModule } from 'src/utils/utils.module';
import { Product } from 'src/database/entities/product.entity';
import { ProductsConsumer } from './consumers/products.consumer';
import { Order } from 'src/database/entities/order.entity';
import { OrdersConsumer } from './consumers/orders.consumer';
import { OrdersQueueEvents } from './providers/retrieve-order-listener.provider';
import { ProductsQueueEvents } from './providers/retrieve-products-listener.provider';
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

@Module({

  imports: [
    UtilsModule,
    AuthModule,
    TypeOrmModule.forFeature([Store, Product, Order, Customer, UserStore, User]),

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
      { name: CUSTOMERS_QUEUE },
      { name: USERS_QUEUE },
    )
  ],

  providers: [
    JobsService,
    ConfigWebhookConsumer,
    ProductsConsumer,
    OrdersConsumer,
    CustomersConsumer,
    StoresConsumer,
    UsersConsumer,

    OrdersQueueEvents,
    CustomersQueueEvents,
    StoresQueueEvents,
    UsersQueueEvents,
  ],
  controllers: [JobsController],
  exports: [JobsService]
})
export class JobsModule { }
