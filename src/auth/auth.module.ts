import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './providers/auth.service';
import { HashingProvider } from './providers/hashing.provider';
import { BcryptProvider } from './providers/bcrypt.provider';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService, {
    provide: HashingProvider,
    useClass: BcryptProvider //we can replace Bcrypt with other algorithms. This provider implements the methods of the HashingProvider abstract class. We can use argon2
  }
  ],
  imports: [],
  exports: [AuthService, HashingProvider]
})
export class AuthModule {}
