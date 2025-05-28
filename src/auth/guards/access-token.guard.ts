import { CanActivate, ExecutionContext, Inject, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';
import jwtConfiguration from '../config/jwt.config';
import { Request } from 'express';
import { REQUEST_USER_KEY } from '../constants/auth.constants';
import { Reflector } from '@nestjs/core';
import { UserService } from 'src/web-app/user/user.service';

/**
 * Marks the route as a public route. This route can be accessed publicly. The AccessToken Guard will be skipped (return true).
 * The StoreContext Guard will also return true and not bind the default UserStore or if a specific store from the URL's query if specified. (?storeId=123).
 * */
export const Public = () => SetMetadata('isPublic', true);

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly jwtService: JwtService,

    @Inject(jwtConfiguration.KEY)
    private readonly jwtConfig: ConfigType<typeof jwtConfiguration>,

    private userService: UserService,
  ) {}

  private extractToken = (request: Request): string | undefined => {
    // console.log(request.body);

    const [_, token] = request.headers.authorization?.split(' ') ?? [];
    return token;
  };

  async canActivate(context: ExecutionContext): Promise<boolean> {
    //check if the route is public or not. A controller or a specific endpoint can be set public by using @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [context.getHandler(), context.getClass()]);
    if (isPublic) {
      return true;
    }

    //extract the request from context
    const request = context.switchToHttp().getRequest();
    //get the response object
    const response = context.switchToHttp().getResponse();
    //extract token
    const token = this.extractToken(request);

    //validate the token
    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, this.jwtConfig);

      request[REQUEST_USER_KEY] = payload;
      //console.log('the payload is ', payload);

      const { User, UserStore } = await this.userService.findOneByEmail(payload.email);
      //console.log(User, UserStore);
      request.user = User;
      request.roles = UserStore;
    } catch (error) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
