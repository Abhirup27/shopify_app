import {
  forwardRef,
  Inject,
  Injectable,
  RequestTimeoutException,
  UnauthorizedException,
  UseFilters,
} from '@nestjs/common';
import { SignInDto } from '../dtos/signin.dto';
import { HashingProvider } from './hashing.provider';
import { RequestExceptionFilter } from '../../filters/timeout.exception.filter';

import { JwtService } from '@nestjs/jwt';
import jwtConfiguration from '../config/jwt.config';
import { ConfigType } from '@nestjs/config';
import { DataService } from 'src/data/data.service';

@Injectable()
@UseFilters(RequestExceptionFilter)
export class SignInProvider {
  constructor(
    @Inject(forwardRef(() => DataService))
    private readonly dataService: DataService,

    private readonly hashingProvider: HashingProvider,
    private readonly jwtService: JwtService,

    @Inject(jwtConfiguration.KEY)
    private readonly jwtConfig: ConfigType<typeof jwtConfiguration>,
  ) {}

  public signIn = async (signInDto: SignInDto): Promise<string> => {
    const {
      User: { email, password, user_id },
    } = await this.dataService.findOneByEmail(signInDto.email);

    let isEqual: boolean = false;

    try {
      isEqual = await this.hashingProvider.comparePassword(signInDto.password, password);
    } catch (error) {
      throw new RequestTimeoutException(error, {
        description: 'Could not compare passwords',
      });
    }

    if (!isEqual) {
      throw new UnauthorizedException('Incorrect Password');
    }

    //console.log(userDetails.User.user_id)
    return await this.jwtService.signAsync(
      {
        sub: user_id,
        email: email,
      },
      {
        audience: this.jwtConfig.signOptions.audience,
        issuer: this.jwtConfig.signOptions.issuer,
        secret: this.jwtConfig.secret,
        expiresIn: this.jwtConfig.signOptions.expiresIn,
      },
    );

    //append JWT, and add the userStore, so that the controller can render the dashboard according to the role/permissions
  };
}
