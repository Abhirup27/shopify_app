import { Global, Module } from '@nestjs/common';
import { UtilsService } from './providers/utils.service';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Store } from 'src/entities/store.entity';


// May set this as a global module later
//@Global()
@Module({
  providers: [UtilsService],
  imports: [ConfigModule, HttpModule,
    TypeOrmModule.forFeature([Store])
  ],
  exports: [UtilsService]
})
export class UtilsModule {}
