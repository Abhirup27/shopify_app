import { ExceptionFilter, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UtilsService {
    constructor(private readonly configService: ConfigService)
    {}

    public getStoreByDomain = (shop: string): any =>
    {
        
    }
    
    public validateRequestFromShopify = (request: Record<string, string>): boolean =>
    {
        try {
            const arr: string[] = [];
            const hmac = request.hmac;
            delete request.hmac;

            for (const [key, value] of Object.entries(request)) {
                const encodedKey = key
                    .replace(/%/g, "%25")
                    .replace(/&/g, "%26")
                    .replace(/=/g, "%3D");
                 const encodedValue = value
                    .replace(/%/g, "%25")
                    .replace(/&/g, "%26")
                    .replace(/=/g, "%3D");
                arr.push(`${encodedKey}=${encodedValue}`);
                }

                const str = arr.join("&");
                const crypto = require("crypto");
                const verHmac = crypto
                    .createHmac("sha256", this.configService.get('shopify_api_secret'))
                    .update(str)
                    .digest("hex");

                return verHmac === hmac;
        } catch (error)
        {
            // Use custom logging
            return false;
        }
    }
}
