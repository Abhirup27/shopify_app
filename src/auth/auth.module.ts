import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { HashingProvider } from './providers/hashing.provider';
import { BcryptProvider } from './providers/bcrypt.provider';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/database/entities/user.entity';
import { AuthMiddleware } from './auth.middleware';
import { SignInProvider } from './providers/sign-in.provider';

import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import jwtConfig from './config/jwt.config';
import { DataModule } from 'src/data/data.module';

@Module({
  controllers: [AuthController],
  providers: [
    AuthMiddleware,
    AuthService,
    {
      provide: HashingProvider,
      useClass: BcryptProvider, //we can replace Bcrypt with other algorithms. This provider implements the methods of the HashingProvider abstract class. We can use argon2
    },
    SignInProvider,
  ],
  imports: [
    DataModule,
    TypeOrmModule.forFeature([User]),
    ConfigModule.forFeature(jwtConfig),
    JwtModule.registerAsync(jwtConfig.asProvider()),
  ],
  exports: [AuthService, HashingProvider, AuthMiddleware],
})
export class AuthModule {}
