import { Module } from '@nestjs/common';
import { AppController } from './app.controller';

import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';

import { AppService } from './app.service';
import { UtilsModule } from './utils/utils.module';
import { InstallationModule } from './installation/installation.module';
import { RouterModule } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Store } from './entities/store.entity';
import { User } from './entities/user.entity';
import { UserStore } from './entities/userstore.entity';

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
      type: 'mysql',
      database:'shopify_app',
      username: 'root',
      password:'ABHIrup_27',
      entities: [Store, User, UserStore],
      synchronize: true
     })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
