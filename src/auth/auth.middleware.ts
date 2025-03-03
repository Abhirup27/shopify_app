import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  getJWTAuthToken = (req: Request): string =>
  {
    //this might be different, I might need to check the object later.
    //return (req.headers.authorization != undefined) ? req.headers.authorization?.split(' ')[1] : null;

    return req.cookies['access_token'];
  }

  use(req: Request, res: any, next: () => void) {

    const token = this.getJWTAuthToken(req);

    if (token == null)
    {
      return res.redirect('/login');
    }
    else
    {
      //set req.headers.authorization so that the guard can process
      req.headers.authorization ="Bearer "+token;      
      //add role and permissions to the request object.
    }
    next();
  }
}
