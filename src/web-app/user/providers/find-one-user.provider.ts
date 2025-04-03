import { Injectable, Logger, RequestTimeoutException, UnauthorizedException, UseFilters } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Store } from 'src/database/entities/store.entity';
import { User } from 'src/database/entities/user.entity';
import { UserStore } from 'src/database/entities/userstore.entity';
import { RequestExceptionFilter } from 'src/filters/timeout.exception.filter';
import { Repository } from 'typeorm';


/**
 * This entire provider will probably move under the jobs module in the future.
 */

@Injectable()
@UseFilters(RequestExceptionFilter)
export class FindOneUser {
    private readonly logger = new Logger(FindOneUser.name);
    constructor(

        @InjectRepository(Store)
        private readonly storesRepository: Repository<Store>,
        @InjectRepository(User)
        private readonly usersRepository: Repository<User>,
        @InjectRepository(UserStore)
        private readonly userStoresRepository: Repository<UserStore>

    ) { }

    public findOneByEmail = async (email: string): Promise<{ User: User, UserStore: UserStore[] }> => {
        let user: User | undefined = undefined;
        let userRoles: UserStore[] | undefined = undefined;
        try {
            user = await this.usersRepository.findOneBy({
                email: email
            })

        } catch (error) {

            throw new RequestTimeoutException(error, {
                description: 'failed to fetch the user.'
            })
        }

        if (user == null) {
            this.logger.debug('User not found for the email');
            throw new UnauthorizedException('User does not exist.');
        }

        try {

            userRoles = await this.userStoresRepository.find({
                where: {
                    user_id: user.user_id
                }
            })
        } catch (error) {

            throw new RequestTimeoutException(error, {
                description: 'failed to fetch the user.'
            })
        }

        if (userRoles == null) {
            this.logger.debug('User is not in any stores')
        }

        return { User: user, UserStore: userRoles }
    }

    public findOneById = async (userid: number): Promise<{ User: User, UserStore: UserStore[] }> => {
        let user: User | undefined = undefined;
        let userRoles: UserStore[] | undefined = undefined;
        try {
            user = await this.usersRepository.findOneBy({
                user_id: userid
            })

        } catch (error) {

            throw new RequestTimeoutException(error, {
                description: 'failed to fetch the user.'
            })
        }

        if (user == null) {
            this.logger.debug('User not found for the email');
            throw new UnauthorizedException('User does not exist.');
        }

        try {

            userRoles = await this.userStoresRepository.find({
                where: {
                    user_id: user.user_id
                }
            })
        } catch (error) {

            throw new RequestTimeoutException(error, {
                description: 'failed to fetch the user.'
            })
        }

        if (userRoles == null) {
            this.logger.debug('User is not in any stores')
        }

        return { User: user, UserStore: userRoles }
    }


    public findStore = async (userid: number): Promise<Store> => {
        let store: Store;
        try {
            store = await this.storesRepository.findOneBy({
                user_id: userid
            })

        } catch (error) {
            throw new RequestTimeoutException(error, {
                description: 'failed to fetch store.'
            })
        }
        if (store == null) {
            this.logger.debug('store does not exist.')
        }

        return store;
    }

    public getStoreContext = async (userId: number, storeId?: number): Promise<UserStore> => {
        if (storeId && typeof storeId != undefined) {
            const storeContext = await this.userStoresRepository.findOne({
                where: { user_id: userId, store_id: storeId },
                relations: ['store']
            });

            if (storeContext) return storeContext;
        }

        // Otherwise get the primary store or the first one
        const storeContexts = await this.userStoresRepository.find({
            where: { user_id: userId },
            order: { store_id: 'DESC' },  // Primary stores first
            relations: ['store']
        });

        if (!storeContexts.length) {
            throw new Error('No store context found for user');
        }

        return storeContexts[0];
    }
}
