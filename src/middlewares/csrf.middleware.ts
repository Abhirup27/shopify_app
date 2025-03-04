import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { doubleCsrf, DoubleCsrfConfigOptions } from 'csrf-csrf';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private doubleCsrfProtection;

  constructor() {
    //console.log(process.env.CSRF_SECRET)
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
      errorConfig: { // Optional: Customize error properties if needed
        statusCode: 403,
        message: 'Invalid CSRF Token',
        code: 'EBADCSRFTOKEN',
      },
    };

    const {
      generateToken,
      doubleCsrfProtection,
      invalidCsrfTokenError,
    } = doubleCsrf(config);

    this.doubleCsrfProtection = doubleCsrfProtection;
  }

  use(req: Request, res: Response, next: NextFunction) {
    //console.log(req.baseUrl);
    //console.log(req.cookies)
    // Skip CSRF check for specific routes if needed
    if (req.baseUrl === '/login' && req.method === 'POST') {
      return next();
    }
    else if (req.baseUrl == '/webhook/app/uninstalled')
    {
      return next();
    }
    else if (req.baseUrl == '/webhook/orders/updated')
    {
      return next();
    }
    else if (req.baseUrl == '/webhook/orders/create')
    {
      return next();
    }
    else if (req.baseUrl == '/webhook/products/update')
    {
      return next();
    }
    this.doubleCsrfProtection(req, res, next);
  }
}