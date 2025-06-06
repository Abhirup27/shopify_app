import { Module } from '@nestjs/common';
import { ShopifyAuthService } from './shopify-auth.service';
import { UtilsModule } from 'src/utils/utils.module';
import { ShopifyAuthController } from './shopify-auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Store } from 'src/database/entities/store.entity';
import { User } from 'src/database/entities/user.entity';
import { AuthModule } from 'src/auth/auth.module';
import { CreateStoreProvider } from './providers/create-store.provider';
import { UserStore } from 'src/database/entities/userstore.entity';
import { CreateSuperAdmin } from './providers/create-super-admin';
import { JobsModule } from 'src/jobs/jobs.module';
import { DataModule } from '../../data/data.module';

/**
 *This module handles all the tasks specific to installing the shopify app
 *
 * */
@Module({
  imports: [
    UtilsModule,
    AuthModule,
    TypeOrmModule.forFeature([Store, User, UserStore]),
    JobsModule,
    DataModule,

  ],
  providers: [ShopifyAuthService, CreateStoreProvider, CreateSuperAdmin],
  controllers: [ShopifyAuthController],
})
export class ShopifyAuthModule {}
