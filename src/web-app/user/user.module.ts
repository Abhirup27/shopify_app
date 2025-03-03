import { Module } from '@nestjs/common';
import { FindOneUser} from './providers/find-one-user.provider';
import { User } from 'src/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserStore } from 'src/entities/userstore.entity';
import { UserService } from './user.service';
import { Store } from 'src/entities/store.entity';

@Module({
    providers: [FindOneUser, UserService],
    imports: [
    TypeOrmModule.forFeature([User, UserStore, Store]),
    ],
    exports: [UserService]
})
export class UserModule {}
