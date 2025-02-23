import { Injectable, Logger, RequestTimeoutException, UnauthorizedException, UseFilters } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { UserStore } from 'src/entities/userstore.entity';
import { RequestExceptionFilter } from 'src/filters/timeout.exception.filter';
import { Repository } from 'typeorm';

@Injectable()
@UseFilters(RequestExceptionFilter)
export class FindOneUser {
    private readonly logger = new Logger(FindOneUser.name);
    constructor(

        @InjectRepository(User)
        private readonly usersRepository: Repository<User>,
        @InjectRepository(UserStore)
        private readonly userStoresRepository: Repository<UserStore>
        
    ) { }

    public findOneByEmail = async (email: string): Promise<{ User: User, UserStore: UserStore[] }> =>
    {
        let user: User | undefined = undefined;
        let userRoles: UserStore[]| undefined = undefined;
        try {
            user = await this.usersRepository.findOneBy({
                email: email
            })

        } catch (error) {
          
            throw new RequestTimeoutException(error, {
                description: 'failed to fetch the user.'
            })
        }

        if (user == null)
        {
            this.logger.debug('User not found for the email');
            throw new UnauthorizedException('User does not exist.');
        }

        try {
            
             userRoles = await this.userStoresRepository.find({
                where: {
                    user_id: user.user_id
                }
            })
        } catch (error)
        {

            throw new RequestTimeoutException(error, {
                description: 'failed to fetch the user.'
            })
        }

        if (userRoles == null)
        {
            this.logger.debug('User is not in any stores')
        }
        
        return {User: user, UserStore: userRoles}
    }

    public findOneById = async (userid: number): Promise<{ User: User, UserStore: UserStore[] }> =>
    {
        let user: User | undefined = undefined;
        let userRoles: UserStore[]| undefined = undefined;
        try {
            user = await this.usersRepository.findOneBy({
                user_id: userid
            })

        } catch (error) {
          
            throw new RequestTimeoutException(error, {
                description: 'failed to fetch the user.'
            })
        }

        if (user == null)
        {
            this.logger.debug('User not found for the email');
            throw new UnauthorizedException('User does not exist.');
        }

         try {
            
             userRoles = await this.userStoresRepository.find({
                where: {
                    user_id: user.user_id
                }
            })
        } catch (error)
        {

            throw new RequestTimeoutException(error, {
                description: 'failed to fetch the user.'
            })
        }
        
        if (userRoles == null)
        {
            this.logger.debug('User is not in any stores')
        }
        
        return {User: user, UserStore: userRoles}
    }
}
