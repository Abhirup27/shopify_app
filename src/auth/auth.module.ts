import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { HashingProvider } from './providers/hashing.provider';
import { BcryptProvider } from './providers/bcrypt.provider';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { UserModule } from 'src/web-app/user/user.module';
import { AuthMiddleware } from './auth.middleware';
import { SignInProvider } from './providers/sign-in.provider';

@Module({
  controllers: [AuthController],
  providers: [
    AuthMiddleware,
    AuthService,
    {
    provide: HashingProvider,
    useClass: BcryptProvider //we can replace Bcrypt with other algorithms. This provider implements the methods of the HashingProvider abstract class. We can use argon2
    },
    SignInProvider
  ],
  imports: [
    UserModule,
    TypeOrmModule.forFeature([User])
  ],
  exports: [AuthService, HashingProvider, AuthMiddleware]
  
})
export class AuthModule {}
