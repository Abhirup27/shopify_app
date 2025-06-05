import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';

import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/configuration';

import { AppService } from './app.service';
import { UtilsModule } from './utils/utils.module';
import { InstallationModule } from './installation/installation.module';
import { APP_FILTER, APP_GUARD, RouterModule } from '@nestjs/core';

import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { WebAppModule } from './web-app/web-app.module';

import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { throttlerConfig } from './config/rate-limiting.config';
import { RateLimitingGuard } from './guards/rate-limiting/rate-limiting.guard';
import { CsrfMiddleware } from './middlewares/csrf.middleware';
import { CsrfExceptionFilter } from './filters/csrf.exception.filter';
import { JobsModule } from './jobs/jobs.module';
import { moduleOptions } from './database/typeorm.config';
import { DataModule } from './data/data.module';
import { ScheduleModule } from '@nestjs/schedule';
import { StartupService } from './startup.service';

//we pass this value through the command line/system variables
const ENV = process.env.NODE_ENV;

@Module({
  imports: [
    ConfigModule.forRoot(
      {
        isGlobal: true,
        load: [configuration],
        //envFilePath: ['.env.development']
        envFilePath: !ENV ? '.env' : `.env.${ENV}`,
      }
    ),
    UtilsModule,
    InstallationModule,
    RouterModule.register(
      [{
        path: '/shopify/auth',
        module: InstallationModule
      },]
    ),

    // For running cron jobs.
    ScheduleModule.forRoot(),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: moduleOptions,
    }),
    ThrottlerModule.forRoot({ throttlers: [throttlerConfig] }),
    AuthModule,
    WebhooksModule,
    WebAppModule,
    JobsModule,
    DataModule
  ],
  controllers: [],

  providers: [AppService,
    {
      provide: APP_FILTER,
      useClass: CsrfExceptionFilter
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitingGuard
    },
    // To run tasks which need to run once during startup.
    StartupService
  ],
  exports: []
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CsrfMiddleware).exclude('/webhook/*').forRoutes('*');
  }
}

