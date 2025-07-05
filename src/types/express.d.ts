import { Express } from 'express';
import { Query } from 'express-serve-static-core';
import { UserStore } from 'src/database/entities/userstore.entity';
import { User } from 'src/database/entities/user.entity';

export interface TRequest<B, Q extends Query> extends Express.Request {
  storeId?: string;
  userStore?: UserStore;
  roles?: UserStore[];
  user?: User;
  query?: Q;
  body?: B;
  headers: Record<string, unkown>;
}
