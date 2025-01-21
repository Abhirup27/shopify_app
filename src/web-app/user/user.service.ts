import { Injectable } from '@nestjs/common';
import { FindOneUser } from './providers/find-one-user.provider';
import { User } from 'src/entities/user.entity';
import { UserStore } from 'src/entities/userstore.entity';

@Injectable()
export class UserService {
    constructor(
        private readonly findOneUserProvider : FindOneUser
    ){}

    public async findOneByEmail(email: string): Promise<{ User: User, UserStore: UserStore[] }> 
    {
        return this.findOneUserProvider.findOneByEmail(email);
    }
    public async findOneById(userid: number): Promise<{ User: User, UserStore: UserStore[] }> 
    {
        return this.findOneUserProvider.findOneById(userid);
    }
}
