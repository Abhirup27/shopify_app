import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { WebAppController } from './web-app.controller';
import { AuthMiddleware } from 'src/auth/auth.middleware';


/**
 * This module will import submodules which will serve different pages of the website.
 */
@Module({
  imports: [UserModule],
  controllers: [WebAppController]
})
export class WebAppModule implements NestModule {

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware)
    .forRoutes({ path: 'dashboard', method: RequestMethod.GET })
  }
}
