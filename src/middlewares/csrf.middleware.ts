import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { doubleCsrf, DoubleCsrfConfigOptions } from 'csrf-csrf';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private doubleCsrfProtection;
  private generateCsrfToken;
  constructor() {
    //console.log(process.env.CSRF_SECRET)
    const config: DoubleCsrfConfigOptions = {
      getSecret: () => process.env.CSRF_SECRET,
      cookieName: 'x-csrf-token',
      cookieOptions: {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        //signed: false,
      },
      size: 64,
      //getTokenFromRequest: (req) => { return req.cookies['x-csrf-token'].split('|')[0] },
      getCsrfTokenFromRequest: req => {
        return req.header('x-csrf-token');
      },
      getSessionIdentifier: req => {
        return req.header('access_token') ?? req.cookies['access_token'];
      },
      errorConfig: { // Optional: Customize error properties if needed
        statusCode: 403,
        message: 'Invalid CSRF Token',
        code: 'EBADCSRFTOKEN',
      },
    };

    const {
      generateCsrfToken,
      doubleCsrfProtection,
      invalidCsrfTokenError,
    } = doubleCsrf(config);

    this.doubleCsrfProtection = doubleCsrfProtection;
    this.generateCsrfToken = generateCsrfToken;
  }

  use(req: Request, res: Response, next: NextFunction) {
    //console.log(req.baseUrl);
    //console.log(req.cookies['x-csrf-token'])
    //console.log(req.headers);

    // instead of doing this, use .exclude in app.module.ts . exclude /webhook/*, post login route
    if (req.baseUrl === '/login' && req.method === 'POST') {
      //this.generateCsrfToken(req, res, next);
      return next();
    } else if(req.baseUrl === '/dashboard' && req.method === 'GET') {
      this.generateCsrfToken(req,res, next);
      return next();
    }
    this.doubleCsrfProtection(req, res, next);
  }
}