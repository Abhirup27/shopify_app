import { Injectable, NestMiddleware } from '@nestjs/common';
import { UserStore } from 'src/database/entities/userstore.entity';

@Injectable()
export class IsAppPublicMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const store: UserStore = req.userStore;
    // console.log(req);

    if (store == null || store == undefined) {
      res.redirect('/');
    }
    console.log(store.store.IsPrivate());

    next();
  }
}
