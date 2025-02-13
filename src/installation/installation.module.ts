import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { InstallationService } from './installation.service';
import { UtilsModule } from 'src/utils/utils.module';
import { InstallationController } from './installation.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Store } from 'src/entities/store.entity';
import { User } from 'src/entities/user.entity';
import { AuthModule } from 'src/auth/auth.module';
import { CreateStoreProvider } from './providers/create-store.provider';
import { UserStore } from 'src/entities/userstore.entity';
import { CreateSuperAdmin } from './providers/create-super-admin';

@Module({
  imports: [
    UtilsModule,
    AuthModule,
    TypeOrmModule.forFeature([Store, User, UserStore])
  ],
  providers: [InstallationService, CreateStoreProvider, CreateSuperAdmin],
  controllers: [InstallationController]

})
export class InstallationModule {}