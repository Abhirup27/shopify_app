import { Controller, Get, Render, Req, Res } from '@nestjs/common';
import { doubleCsrf, DoubleCsrfConfigOptions } from 'csrf-csrf';
import { Request, Response} from 'express';
@Controller()
export class WebAppController {

    @Get()
    @Render('login')
    public async login(@Req() req: Request, @Res() res : Response)
    {

        //need to write the middleware
    const config: DoubleCsrfConfigOptions = {
      getSecret: () => process.env.CSRF_SECRET,
      cookieName: 'x-csrf-token',
      cookieOptions: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      },
      size: 64,
      getTokenFromRequest: (req) => req.headers['x-csrf-token'],
    };

    const { generateToken } = doubleCsrf(config);
    const token = generateToken(req,res)
        return {appName: 'Shopify App', style: '',csrfToken: token, messages: ''}
    }
    @Get('/dashboard')
    public async getDashboard(@Req() req: Request, @Res() res)
    {
        //return according to the role of the user
    }

}
