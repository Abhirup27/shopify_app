import { Module } from '@nestjs/common';
import { InstallationService } from './providers/installation.service';
import { UtilsModule } from 'src/utils/utils.module';
import { InstallationController } from './installation.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Store } from 'src/entities/store.entity';
import { User } from 'src/entities/user.entity';

@Module({
  imports: [
    UtilsModule,
    TypeOrmModule.forFeature([Store, User])
  ],
  providers: [InstallationService],
  controllers: [InstallationController]

})
export class InstallationModule {}
