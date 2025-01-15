import { Global, Module } from '@nestjs/common';
import { UtilsService } from './providers/utils.service';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';


// May set this as a global module later
//@Global()
@Module({
  providers: [UtilsService],
  imports: [ConfigModule, HttpModule],
  exports: [UtilsService]
})
export class UtilsModule {}
