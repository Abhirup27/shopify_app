import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cacheable } from 'cacheable';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject('CACHE_INSTANCE') private readonly cache: Cacheable) {}

  public get = async <T>(key: string): Promise<T> => {
    return await this.cache.get<T>(key);
  };

  public set = async <T>(key: string, value: T, ttl?: number | string): Promise<boolean> => {
    try {
      const result = await this.cache.set<T>(key, value, ttl);
      if (result) {
        return true;
      } else {
        this.logger.warn(`key ${key} was not saved in memory.`);
        return false;
      }
    } catch (error) {
      this.logger.error(error.message, error.stack);
      return false;
    }
  };

  public delete = async (key: string): Promise<boolean> => {
    return await this.cache.delete(key);
  };

  async mget(...args: string[]) {
    return Promise.all(args.map(key => this.cache.get(key)));
  }

  async mset(args: [string, unknown][], ttl?: number) {
    await Promise.all(args.map(([key, value]) => this.set(key, value, ttl)));
  }

}
