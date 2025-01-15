import { Module } from '@nestjs/common';
import { InstallationService } from './providers/installation.service';
import { UtilsModule } from 'src/utils/utils.module';
import { InstallationController } from './installation.controller';

@Module({
  imports: [UtilsModule],
  providers: [InstallationService],
  controllers: [InstallationController]

})
export class InstallationModule {}
