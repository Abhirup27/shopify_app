import { Module } from '@nestjs/common';
import { UtilsService } from './providers/utils.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  providers: [UtilsService],
  imports: [ConfigModule]
})
export class UtilsModule {}
