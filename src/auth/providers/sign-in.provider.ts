import { forwardRef, Inject, Injectable, RequestTimeoutException, UnauthorizedException, UseFilters } from '@nestjs/common';
import { UserService } from 'src/web-app/user/user.service';
import { SignInDto } from '../dtos/signin.dto';
import { HashingProvider } from './hashing.provider';
import { RequestExceptionFilter } from '../../filters/timeout.exception.filter';

import { JwtService } from "@nestjs/jwt";
import jwtConfiguration from "../config/jwt.config";
import { ConfigType } from "@nestjs/config";

@Injectable()
@UseFilters(RequestExceptionFilter)
export class SignInProvider {

    constructor(
        @Inject(forwardRef(()=> UserService))
        private readonly usersService: UserService,

        private readonly hashingProvider: HashingProvider,
         private readonly jwtSerice: JwtService,

         @Inject(jwtConfiguration.KEY)
         private readonly jwtConfig: ConfigType<typeof jwtConfiguration>

    ){}

    public signIn = async (signInDto: SignInDto) =>
    {
        
        const userDetails = await this.usersService.findOneByEmail(signInDto.email);


        let isEqual: boolean = false;

        try {
            
            isEqual = await this.hashingProvider.comparePassword(signInDto.password, userDetails.User.password);
        
        } catch (error)
        {
            throw new RequestTimeoutException(error, {
                description: 'Could not compare passwords'
            })
        }

        if (!isEqual)
        {
            throw new UnauthorizedException('Incorrect Password');

        }

        console.log(userDetails.User.user_id)
        const accessToken = await this.jwtSerice.signAsync(
            {
                sub: userDetails.User.user_id,
                email: userDetails.User.email,
            },
            {
                audience: this.jwtConfig.signOptions.audience,
                issuer: this.jwtConfig.signOptions.issuer,
                secret: this.jwtConfig.secret,
                expiresIn: this.jwtConfig.signOptions.expiresIn
            }
        )

        return {
            accessToken
        };
        

        //append JWT, and add the userStore, so that the controller can render the dashboard according to the role/permissions 
        
    }
}
