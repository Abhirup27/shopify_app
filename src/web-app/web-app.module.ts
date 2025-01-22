import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { WebAppController } from './web-app.controller';
import { AuthMiddleware } from 'src/auth/auth.middleware';
import { AuthModule } from 'src/auth/auth.module';
import { UtilsModule } from 'src/utils/utils.module';


/**
 * This module will import submodules which will serve different pages of the website.
 */
@Module({
  imports: [UtilsModule, UserModule, AuthModule],
  controllers: [WebAppController]
})
export class WebAppModule implements NestModule {

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware)
    .forRoutes({ path: 'dashboard', method: RequestMethod.GET })
  }
}
