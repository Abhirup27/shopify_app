import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { ProductsType } from '../consumers/products.consumer';
@Injectable()
export class CacheProvider {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async storeMap(key: string, map: Map<string, ProductsType | ProductsType[]>): Promise<void> {
    await this.redis.hmset(key, map);
  }
  async getMapField(key: string, field: string): Promise<string | null> {
    return await this.redis.hget(key, field);
  }
  async getMap(key: string): Promise<Record<string, string>> {
    return await this.redis.hgetall(key);
  }
  async getMapKeys(key: string): Promise<string[]> {
    return await this.redis.hkeys(key);
  }
  async mapFieldExists(key: string, field: string): Promise<boolean> {
    const exists = await this.redis.hexists(key, field);
    return exists === 1;
  }
}
