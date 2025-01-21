import { Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  getJWTAuthToken = async (req): Promise<string> =>
  {
    //this might be different, I might need to check the object later.
    return (req.headers.authorization != undefined) ? req.headers.authorization?.split(' ')[1] : null;
  }

  use(req: any, res: any, next: () => void) {

    const token = this.getJWTAuthToken(req);

    if (token == null)
    {
      return res.redirect('/login');
    }
    else
    {
      //make sure the token is valid
      

      //add role and permissions to the request object.
    }
    next();
  }
}
