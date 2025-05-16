import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import configuration from '../config/configuration';
import * as path from 'path';
import { config } from 'dotenv';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

// Load environment variables from the appropriate .env file
const nodeEnv = process.env.NODE_ENV ?? '';
const envPath = path.resolve(
  process.cwd(),
  `.env${nodeEnv == 'production' || nodeEnv == '' ? '' : '.'}${nodeEnv != 'production' ? nodeEnv : ''}`,
);
console.log(envPath);
config({ path: envPath });

const configObject = configuration();
console.log(__dirname);
export const dataSourceOptions: DataSourceOptions = {
  type: configObject.database.type,
  host: configObject.database.host,
  port: configObject.database.port,
  username: configObject.database.username,
  password: configObject.database.password as any,
  database: configObject.database.name,
  entities: [path.join(__dirname, '..', 'database', 'entities', '*.entity.{ts,js}')],
  migrations: [path.join(__dirname, '..', 'database', 'migrations', '*.{ts,js}')],
  synchronize: configObject.database.synchronize,
  //logging: configObject.database.logging === 'true',
};

// For migrations, export the DataSource directly
const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource;

// For App Module
export const moduleOptions = async (configService: ConfigService): Promise<TypeOrmModuleOptions> => {
  return {
    type: configService.get<any>('database.type'),
    host: configService.get<string>('database.host'),
    port: configService.get<number>('database.port'),
    username: configService.get<string>('database.username'),
    password: configService.get<string>('database.password'),
    database: configService.get<string>('database.name'),
    entities: [path.join(__dirname, '..', 'database', 'entities', '*.entity.{ts,js}')],

    autoLoadEntities: configService.get<boolean>('database.autoload'),
    migrations: [path.join(__dirname, '..', 'database', 'migrations', '*.{ts,js}')],

    synchronize: configService.get<boolean>('database.synchronize'),
    logging: configService.get<boolean>('database.logging') === true,
    migrationsRun: configService.get<boolean>('database.runMigrationsOnStart') === true,
  };
};
