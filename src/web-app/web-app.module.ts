import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
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
import { DataModule } from 'src/data/data.module';
import { RouteMiddleware } from './middlewares/route.middleware';

/**
 * This module contains the endpoints(controller) which serves the users of the app.
 */
@Module({
  imports: [

    DataModule,
    JobsModule,
    UtilsModule,
    AuthModule,
    ConfigModule.forFeature(routesConfig),
    ConfigModule.forFeature(jwtConfig),
    JwtModule.registerAsync(jwtConfig.asProvider()),
  ],
  controllers: [WebAppController],
  providers: [WebAppService, RouteService],
  exports: [],
})
export class WebAppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {

    consumer
      .apply(AuthMiddleware)
      .exclude({ path: '/', method: RequestMethod.GET }, { path: '/login', method: RequestMethod.POST })
      .forRoutes(WebAppController);

    consumer
      .apply(RouteMiddleware)
      .exclude({ path: '/', method: RequestMethod.GET }, { path: '/login', method: RequestMethod.POST })
      .forRoutes(WebAppController);
  }
}
