import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './dtos/signin.dto';

@Controller('auth')
export class AuthController {

    constructor(
        private readonly authService: AuthService
    )
    { }

    //I wont need this controller for this project as I use the auth module from the web-app module
     @Post('sign-in')
    public async signIn(@Body() signInDto: SignInDto): Promise<any> {
            
         
         return 'ok'
    }
}
