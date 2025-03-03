import { Injectable } from '@nestjs/common';
import { FindOneUser } from './providers/find-one-user.provider';
import { User } from 'src/entities/user.entity';
import { UserStore } from 'src/entities/userstore.entity';
import { Store } from 'src/entities/store.entity';

@Injectable()
export class UserService {
    constructor(
        private readonly findOneUserProvider : FindOneUser
    ){}

    public async findOneByEmail(email: string): Promise<{ User: User, UserStore: UserStore[]}> 
    {
        return this.findOneUserProvider.findOneByEmail(email);
    }
    public async findOneById(userid: number): Promise<{ User: User, UserStore: UserStore[] }> 
    {
        return this.findOneUserProvider.findOneById(userid);
    }

    public async createUser(): Promise<User | boolean> 
    {

        return true
    }

    public async createManyUsers(): Promise<User | boolean> 
    {
        
        return true
    }

    public async findStore(userId: number): Promise<Store>
    {
        return await this.findOneUserProvider.findStore(userId);
    }
}
