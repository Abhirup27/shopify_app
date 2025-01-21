import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { doubleCsrf, DoubleCsrfConfigOptions } from 'csrf-csrf';

@Controller('csrf')
export class CsrfController {
  private generateToken;

  constructor() {
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
    this.generateToken = generateToken;
  }

  @Get('token')
  getCsrfToken(@Res() res: Response) {
    const token = this.generateToken(res);
    return res.json({ token });
  }
}