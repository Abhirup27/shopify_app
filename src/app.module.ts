import { Module } from '@nestjs/common';
import { AppController } from './app.controller';

import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';

import { AppService } from './app.service';
import { UtilsModule } from './utils/utils.module';
import { InstallationModule } from './installation/installation.module';
import { RouterModule } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    UtilsModule,
    InstallationModule,
    RouterModule.register(
      [{
        path: '/shopify/auth',
        module:InstallationModule
      },
      ])
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
