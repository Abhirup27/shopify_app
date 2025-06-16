import { createClient, createKeyv, RedisClientType } from '@keyv/redis';
import { Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Cacheable, Keyv } from 'cacheable';
import { CacheService } from './cache.service';
//import { RedlockModule } from '@anchan828/nest-redlock';
import redlockConfig from './cache.config';
import Client from 'ioredis';
import Redlock from 'redlock';

@Module({
  imports: [ConfigModule.forFeature(redlockConfig)],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (config: ConfigService) => {
        const clientType: RedisClientType = createClient({
          url: `redis://${config.get('redis.host', 'localhost')}:${config.get('redis.port', '6739')}`,
        });
        return createKeyv(clientType);
        /*return new Client({
          host: config.get('redis.host', 'localhost'),
          port: config.get('redis.port', 6379),
          maxRetriesPerRequest: null, // Critical for Redlock
        });*/
      },
      inject: [ConfigService],
    },
    {
      provide: 'CACHE_INSTANCE',
      useFactory: (redisClient: Keyv, config: ConfigService) => {

        // Correct usage per function signature
        // const keyv = createKeyv(redisClient, {
        //   // Add any KeyvRedisOptions here if needed
        // });

        return new Cacheable({
          primary: redisClient,
          ttl: config.get('cache.ttl', '5m'),
        });
      },
      inject: ['REDIS_CLIENT', ConfigService],
    },
    {
      provide: 'CACHE_LOCK',
      useFactory: (redisClient: Client, config: ConfigService) => {
        const client =  new Client({
          host: config.get('redis.host', 'localhost'),
          port: config.get('redis.port', 6379),
          maxRetriesPerRequest: null, // Critical for Redlock
        })
        return new Redlock([client], {
          driftFactor: 0.01,
          retryCount: 2,
          retryDelay: 300,
          retryJitter: 200,
          automaticExtensionThreshold: 0,
        });
      },
      inject: ['REDIS_CLIENT', ConfigService],
    },
    CacheService,
  ],
  exports: ['CACHE_INSTANCE', 'CACHE_LOCK'],
})
export class CacheModule implements OnApplicationShutdown {
  constructor(@Inject('REDIS_CLIENT') private readonly redisClient: Client) {}
  async onApplicationShutdown() {
    try {
      await this.redisClient.disconnect();
    } catch (err) {
      console.error('Redis shutdown error', err);
    }
  }
}