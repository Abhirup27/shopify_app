import { Global, Module } from '@nestjs/common';
import { UtilsService } from './utils.service';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Store } from 'src/database/entities/store.entity';
import { RequestToShopifyProvider } from './providers/request-to-shopify.provider';
import { CsrfProvider } from './providers/csrf.provider';


// May set this as a global module later
//@Global()
@Module({
  providers: [UtilsService, RequestToShopifyProvider, CsrfProvider],
  imports: [ConfigModule, HttpModule,
    TypeOrmModule.forFeature([Store])
  ],
  exports: [UtilsService]
})
export class UtilsModule { }
