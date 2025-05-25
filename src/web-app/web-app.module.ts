import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { WebAppController } from './web-app.controller';
import { AuthMiddleware } from 'src/auth/auth.middleware';
import { AuthModule } from 'src/auth/auth.module';
import { UtilsModule } from 'src/utils/utils.module';
import { ConfigModule } from '@nestjs/config';
import jwtConfig from 'src/auth/config/jwt.config';
import { JwtModule } from '@nestjs/jwt';
import { JobsModule } from 'src/jobs/jobs.module';
import { WebAppService } from './web-app.service';
import routesConfig from './config/routes.config';
import { RouteService } from './providers/routes.provider';

/**
 * This module will import submodules which will serve different pages of the website.
 */
@Module({
  imports: [
    JobsModule,
    UtilsModule,
    UserModule,
    AuthModule,
    ConfigModule.forFeature(routesConfig),
    ConfigModule.forFeature(jwtConfig),
    JwtModule.registerAsync(jwtConfig.asProvider()),
  ],
  controllers: [WebAppController],
  providers: [WebAppService, RouteService],
  exports: [RouteService],
})
export class WebAppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        { path: 'dashboard', method: RequestMethod.GET },
        { path: 'orders', method: RequestMethod.GET },
        { path: 'logout', method: RequestMethod.POST },
        { path: 'syncOrders', method: RequestMethod.GET },
        { path: 'order', method: RequestMethod.GET },
        { path: 'members', method: RequestMethod.GET },
        { path: 'memberRegister', method: RequestMethod.GET },
        { path: 'createMember', method: RequestMethod.POST },
        { path: 'products', method: RequestMethod.GET },
        { path: 'productCreate', method: RequestMethod.GET },
        { path: 'syncStoreLocations', method: RequestMethod.GET },
        { path: 'productPublish', method: RequestMethod.POST },
        { path: 'taxonomy', method: RequestMethod.GET },
        { path: 'product-categories/children/:id', method: RequestMethod.GET },
        { path: 'syncProducts', method: RequestMethod.GET },
      );
  }
}
