// route.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import routesConfig from '../config/routes.config';

/**
 *This provider service is used in EJS files. It uses the key value pair object returned by the config function.
 * In future I want to use this in controllers.
 * */
@Injectable()
export class RouteService {
  constructor(
    @Inject(routesConfig.KEY)
    private readonly routes: ConfigType<typeof routesConfig>,
  ) {}

  /**
   * Get the URL for a named route. If the route is valid, then it appends the requested parameters and query.
   */
  public route(
    name: string,
    query: Record<string, string | number | boolean | string[]> = {},
    params: Record<string, string | number> = {},
  ): string {
    if (!this.routes[name]) {
      throw new Error(`Route '${name}' is not defined`);
    }

    let url = this.routes[name];

    // Replace path parameters
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, String(value));
    });

    /** Add query parameters to the final endpoint
     * This can be used to make request to a specific store like ?storeId=1 . If the user is part of multiple stores.
     * */
    if (Object.keys(query).length > 0) {
      const queryString = Object.entries(query)
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return value.map(v => `${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`).join('&');
          }
          return `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
        })
        .join('&');

      url += (url.includes('?') ? '&' : '?') + queryString;
    }

    return url;
  }
}
