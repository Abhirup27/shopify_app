import { Injectable, Provider } from '@nestjs/common';
import { Store } from 'src/entities/store.entity';
import { User } from 'src/entities/user.entity';
import { CreateShopDTO } from '../dtos/create-store.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HashingProvider } from 'src/auth/providers/hashing.provider';

@Injectable()
export class CreateStoreProvider {
    constructor(

        @InjectRepository(Store)
        private readonly storesRepository : Repository<Store>,
        @InjectRepository(User)
        private usersRepository : Repository<User>,
        
        private readonly hashingProvider : HashingProvider
    ) {
        
    }

    public createStore = async(createStoreDto: CreateShopDTO, accessToken: string):  Promise<{
    success: boolean;
    store: Store;
    user: User;
    }>  =>
    {
        let existingStore = undefined;

        //we would first need to check if this email already exists in Users table or not, if it already exists then we don't need to create.
        const default_password = '1234';
        const user_payload = {
            'email': createStoreDto.email,
            'password': await this.hashingProvider.hashPassword(default_password),
            //'store_id' : newStore.table_id in another table maybe
            'name': createStoreDto.name,
            'email_verified_at' : new Date()
        }
            
        

        existingStore = await this.storesRepository.findOne({
            where: { 'id': createStoreDto.id }
        })
        
        const payload = {
            'id': createStoreDto['id'],
            'name': createStoreDto['name'],
            'email': createStoreDto['email'],
            'access_token': accessToken,
            'myshopify_domain': createStoreDto['myshopify_domain'],
            'phone': createStoreDto['phone'],
            'address1': createStoreDto['address1'],
            'address2': createStoreDto['address2'],
            'zip': createStoreDto['zip']
            };
        
        let newStore: Store = this.storesRepository.create(payload);
        let newUser: User = this.usersRepository.create(user_payload);

        try {
            newStore = await this.storesRepository.save(newStore);
            newUser = await this.usersRepository.save(newUser);

            return {success : true, store : newStore, user : newUser};
        }
        catch (error)
        {
            console.error(error);
            return {success : false, store : null, user : null};
            
        }
        
            
    }
}
