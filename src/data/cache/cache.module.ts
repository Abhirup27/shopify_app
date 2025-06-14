import { createKeyv } from '@keyv/redis';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Cacheable } from 'cacheable';
import { CacheService } from './cache.service';
//import { RedlockModule } from '@anchan828/nest-redlock';
import redlockConfig from './cache.config';
import Client from 'ioredis';
import Redlock from 'redlock';

@Module({
  imports: [
    ConfigModule.forFeature(redlockConfig),
    // RedlockModule.registerAsync(redlockConfig.asProvider()),
  ],
  providers: [
    {
      provide: 'CACHE_INSTANCE',
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('redis.host') || 'localhost';
        const port = config.get<number>('redis.port') || 6379;

        const primary = createKeyv({
          url: `redis://${host}:${port}`,
        });
        return new Cacheable({ primary, ttl: '1m' });
      },
      inject: [ConfigService],
    },
    {
      provide: 'CACHE_LOCK',
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('redis.host') ?? 'localhost';
        const port = config.get<number>('redis.port') ?? 6379;
        const connection = new Client({ host: host, port: port });

        return new Redlock([connection], {
          driftFactor: 0.01,
          retryCount: 10,
          retryDelay: 200,
          retryJitter: 200,
          automaticExtensionThreshold: 500,
        });
      },
      inject: [ConfigService],
    },
    CacheService,
  ],
  exports: [
    'CACHE_INSTANCE', 'CACHE_LOCK',
    //RedlockModule
  ],
})
export class CacheModule {}
