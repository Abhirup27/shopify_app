import { Injectable } from '@nestjs/common';
import { FindOneUser } from './providers/find-one-user.provider';
import { User } from 'src/database/entities/user.entity';
import { UserStore } from 'src/database/entities/userstore.entity';
import { Store } from 'src/database/entities/store.entity';

@Injectable()
export class UserService {
    constructor(
        private readonly findOneUserProvider: FindOneUser
    ) { }

    // I have to remove the UserStore promise, make a separate function to set current store context
    public async findOneByEmail(email: string): Promise<{ User: User, UserStore: UserStore[] }> {
        return this.findOneUserProvider.findOneByEmail(email);
    }
    public async findOneById(userid: number): Promise<{ User: User, UserStore: UserStore[] }> {
        return this.findOneUserProvider.findOneById(userid);
    }

    public async createUser(): Promise<User | boolean> {

        return true
    }

    public async createManyUsers(): Promise<User | boolean> {

        return true
    }

    public async findStore(userId: number): Promise<Store> {
        return await this.findOneUserProvider.findStore(userId);
    }

    public async getStoreContext(userId: number, storeId: number | undefined): Promise<UserStore | null> {
        return await this.findOneUserProvider.getStoreContext(userId, storeId);
    }
}
