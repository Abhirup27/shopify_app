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
    console.log(req.path)
    // Skip CSRF check for specific routes if needed
    if (req.path === '/login' && req.method === 'POST') {
      return next();
    }

    this.doubleCsrfProtection(req, res, next);
  }
}