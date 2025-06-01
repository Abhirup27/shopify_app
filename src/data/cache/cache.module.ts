import { createKeyv } from '@keyv/redis';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Cacheable } from 'cacheable';
import { CacheService } from './cache.service';

@Module({
  imports: [ConfigModule],
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
    CacheService,
  ],
  exports: ['CACHE_INSTANCE'],
})
export class CacheModule {}
