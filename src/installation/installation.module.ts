import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { InstallationService } from './installation.service';
import { UtilsModule } from 'src/utils/utils.module';
import { InstallationController } from './installation.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Store } from 'src/database/entities/store.entity';
import { User } from 'src/database/entities/user.entity';
import { AuthModule } from 'src/auth/auth.module';
import { CreateStoreProvider } from './providers/create-store.provider';
import { UserStore } from 'src/database/entities/userstore.entity';
import { CreateSuperAdmin } from './providers/create-super-admin';
import { JobsModule } from 'src/jobs/jobs.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NonceProvider } from './providers/nonce.provider';

@Module({
  imports: [
    UtilsModule,
    AuthModule,
    TypeOrmModule.forFeature([Store, User, UserStore]),
    JobsModule,
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'single',
        //url: configService.get<string>('REDIS_URL'), 
        url: `redis://${configService.get('REDIS_HOST')}:${configService.get('REDIS_PORT')}`
      }),
    }),
  ],
  providers: [InstallationService, CreateStoreProvider, CreateSuperAdmin, NonceProvider],
  controllers: [InstallationController]

})
export class InstallationModule { }