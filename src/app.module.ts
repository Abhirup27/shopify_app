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
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: moduleOptions,
      /** useFactory: async (configService: ConfigService) => ({
 
         host: configService.get('database.host'),
         type: configService.get('database.type').toString(),
         port: parseInt(configService.get('database.port'), 10),
         database: configService.get<string>('database.name'),
         username: configService.get<string>('database.username'),
         password: configService.get<string>('database.password'),
 
         entities: [
           Store,
           User,
           UserStore,
           Product,
           Order,
           Customer
         ],
 
         synchronize: configService.get<boolean>('database.synchronize'),
         autoLoadEntities: configService.get<boolean>('database.autoload'),
         migrations: ['src/database/migrations/*-migration.ts'],
         migrationsRun: false
       }), **/
    }),
    ThrottlerModule.forRoot({ throttlers: [throttlerConfig] }),
    AuthModule,
    WebhooksModule,
    WebAppModule,
    JobsModule
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
    }
  ],
  exports: []
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CsrfMiddleware)
      .forRoutes('*')
  }
}

