// rate-limiting.config.ts
import { ExecutionContext } from '@nestjs/common';
import { ThrottlerModuleOptions, ThrottlerOptions } from '@nestjs/throttler';

export const throttlerConfig: ThrottlerOptions = {
  ttl: 60000,
  limit: 10,
  // getTracker: (req: Record<string, any>, context: ExecutionContext): Promise<string> => {
  //   const shop = req.query?.shop || req.body?.shop;
  //   return Promise.resolve(shop ? `${req.ip}-${shop}` : req.ip);
  // }
};