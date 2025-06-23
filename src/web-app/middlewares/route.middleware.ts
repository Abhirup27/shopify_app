import { Injectable, NestMiddleware } from '@nestjs/common';
import { RouteService } from '../providers/routes.provider';
import { Response } from 'express';

/**
 * bind the Route function so that it is usable inside ejs templates.
 * */
@Injectable()
export class RouteMiddleware implements NestMiddleware {
  constructor(private readonly routeService: RouteService) {}

  use(req: any, res: Response, next: () => void) {
    res.locals.route = (
      name: string,
      query: Record<string, string | number | boolean | string[]> = {},
      params: Record<string, string | number> = {},
    ) => this.routeService.route(name, query, params);
    next();
  }
}
