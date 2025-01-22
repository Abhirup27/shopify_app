import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';

import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';

import { AppService } from './app.service';
import { UtilsModule } from './utils/utils.module';
import { InstallationModule } from './installation/installation.module';
import { APP_FILTER, APP_GUARD, RouterModule } from '@nestjs/core';

import { TypeOrmModule } from '@nestjs/typeorm';
import { Store } from './entities/store.entity';
import { User } from './entities/user.entity';
import { UserStore } from './entities/userstore.entity';
import { AuthModule } from './auth/auth.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { WebAppModule } from './web-app/web-app.module';

import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { throttlerConfig } from './config/rate-limiting.config';
import { RateLimitingGuard } from './guards/rate-limiting/rate-limiting.guard';
import { CsrfController } from './csrf.controller';
import { CsrfMiddleware } from './middlewares/csrf.middleware';
import { CsrfExceptionFilter } from './filters/csrf.exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    UtilsModule,
    InstallationModule,
    RouterModule.register(
      [{
        path: '/shopify/auth',
        module:InstallationModule
      },]
    ),
    TypeOrmModule.forRoot({
      host: 'localhost',
      type: 'mysql',
      database:'shopify_app',
      username: 'root',
      password:'ABHIrup_27',
      entities: [Store, User, UserStore],
      synchronize: true
    }),
    ThrottlerModule.forRoot({throttlers: [throttlerConfig]}),
    AuthModule,
    WebhooksModule,
    WebAppModule
  ],
  controllers: [CsrfController],

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

