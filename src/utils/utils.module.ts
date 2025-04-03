import { Global, Module } from '@nestjs/common';
import { UtilsService } from './utils.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Store } from 'src/database/entities/store.entity';
import { RequestToShopifyProvider } from './providers/request-to-shopify.provider';
import { CsrfProvider } from './providers/csrf.provider';
import { RedisModule } from '@nestjs-modules/ioredis';
import { NonceProvider } from './providers/nonce.provider';


// May set this as a global module later
//@Global()
@Module({
  providers: [UtilsService, RequestToShopifyProvider, CsrfProvider, NonceProvider],
  imports: [ConfigModule, HttpModule,
    TypeOrmModule.forFeature([Store]),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'single',
        //url: configService.get<string>('REDIS_URL'), 
        url: `redis://${configService.get('REDIS_HOST')}:${configService.get('REDIS_PORT')}`
      }),
    }),
  ],

  exports: [UtilsService]
})
export class UtilsModule { }
