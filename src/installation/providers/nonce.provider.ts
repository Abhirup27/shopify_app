import { Inject, Injectable } from "@nestjs/common";
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from "ioredis";

@Injectable()
export class NonceProvider 
{
    private readonly NONCE_PREFIX = 'shopify:nonce:';
    private readonly NONCE_EXPIRY = 600;

    constructor
    (
         @InjectRedis() private readonly redis: Redis,
    )
    { }
    
    public storeNonce = async (nonce: String, shopDomain: string): Promise<void> =>
    {

        await this.redis.set(`${this.NONCE_PREFIX}${nonce}`, shopDomain, 'EX', this.NONCE_EXPIRY);
    }


    public validateAndRemoveNonce = async (nonce: string, shopDomain: string): Promise<boolean> =>
    {
        const key = `${this.NONCE_PREFIX}${nonce}`;
        const storedShopDomain = await this.redis.get(key);

        if (storedShopDomain === shopDomain)
        {
            await this.redis.del(key);
            return true;
        }
        return false;
    }
}