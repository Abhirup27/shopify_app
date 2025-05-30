import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from 'src/database/entities/customer.entity';
import { Order } from 'src/database/entities/order.entity';
import { Product } from 'src/database/entities/product.entity';
import { ProductType } from 'src/database/entities/productType.entity';
import { ProductVariant } from 'src/database/entities/productVariant.entity';
import { Store } from 'src/database/entities/store.entity';
import { StoreLocations } from 'src/database/entities/storeLocations.entity';
import { Subscription } from 'src/database/entities/subscription.entity';
import { User } from 'src/database/entities/user.entity';
import { UserStore } from 'src/database/entities/userstore.entity';
import { DataService } from './data.service';
import { CacheModule } from '@nestjs/cache-manager';
import { RedisClusterOptions } from '@nestjs-modules/ioredis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createKeyv, Keyv } from '@keyv/redis';
import { CacheableMemory } from 'cacheable';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ttl: config.get<number>('CACHE_TTL') ?? 60000,
        stores: [
          new Keyv({
            store: new CacheableMemory({ ttl: config.get<number>('CACHE_TTL'), lruSize: 5000 }),
          }),
          createKeyv({
            url: `redis://${config.get<string>('redis.host')}:${config.get<number>('redis.port')}`,
          }),
        ],
      }),
    }),
    TypeOrmModule.forFeature([
      User,
      UserStore,
      Store,
      Product,
      Customer,
      ProductType,
      Order,
      ProductVariant,
      StoreLocations,
      Subscription,
    ]),
  ],
  providers: [DataService],
  exports: [DataService],
})
export class DataModule {}
