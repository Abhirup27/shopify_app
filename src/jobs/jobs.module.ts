import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JobsService } from './jobs.service';
import { CONFIGURE_QUEUE, PRODUCTS_QUEUE } from './constants/jobs.constants';
import { ConfigWebhookConsumer } from './consumers/config-webhoook.consumer';
import { JobsController } from './jobs.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Store } from 'src/entities/store.entity';
import { UtilsModule } from 'src/utils/utils.module';

@Module({

  imports: [
    UtilsModule,
    TypeOrmModule.forFeature([Store]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      
      useFactory: async (configService : ConfigService) => ({
      connection: {
        host: configService.get<string>('redis.host'),
        port:  configService.get<number>('redis.port'),
        }
      })

    }),
     BullModule.registerQueueAsync(
       { name: CONFIGURE_QUEUE },
       { name: PRODUCTS_QUEUE },
       { name: 'Order' },
       { name: 'Store' }
     )
  ],

  providers: [JobsService, ConfigWebhookConsumer],

  controllers: [JobsController]
})
export class JobsModule {}
