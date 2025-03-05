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


/**
 * This module will import submodules which will serve different pages of the website.
 */
@Module({
  imports: [
    JobsModule,
    UtilsModule,
    UserModule,
    AuthModule,
    ConfigModule.forFeature(jwtConfig),
    JwtModule.registerAsync(jwtConfig.asProvider())
  ],
  controllers: [WebAppController],
  providers: [WebAppService]
})
export class WebAppModule implements NestModule {

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware)
    .forRoutes({ path: 'dashboard', method: RequestMethod.GET })
  }
}
