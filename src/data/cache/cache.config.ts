import {  registerAs } from '@nestjs/config';
import { RedlockModuleOptions } from '@anchan828/nest-redlock';
import Redis from 'ioredis';
import configuration from '../../config/configuration';
//const configObject = configuration();
export default registerAs('redlock-config', (config = configuration()): RedlockModuleOptions => {
  return {
    clients: [new Redis({ host: config.redis.host || 'localhost', port: config.redis.port || 6379 })],
    settings: {
      driftFactor: 0.01,
      retryCount: 10,
      retryDelay: 200,
      retryJitter: 200,
      automaticExtensionThreshold: 500,
    },
    duration: 1000,
  };
});
