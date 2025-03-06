// route.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import routeConfig from '../config/routes.config';

@Injectable()
export class RouteService {
    constructor(
        @Inject(routeConfig.KEY)
        private readonly routes: ConfigType<typeof routeConfig>
    ) { }

    /**
     * Get the URL for a named route
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

        // Add query parameters
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