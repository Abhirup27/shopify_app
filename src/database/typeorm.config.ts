import { ConfigService } from "@nestjs/config";
import { DataSource, DataSourceOptions } from "typeorm";
import configuration from "../config/configuration"
import * as path from 'path';
import { config } from 'dotenv';
import { TypeOrmModuleOptions } from "@nestjs/typeorm";

// Load environment variables from the appropriate .env file
const nodeEnv = process.env.NODE_ENV ?? '';
const envPath = path.resolve(process.cwd(), `.env${(nodeEnv == 'production' || nodeEnv == '') ? '' : '.'}${nodeEnv != 'production' ? nodeEnv : ''}`);
console.log(envPath);
config({ path: envPath });


const configObject = configuration();

export const dataSourceOptions: DataSourceOptions = {
  type: configObject.database.type as any,
  host: configObject.database.host as string,
  port: configObject.database.port as number,
  username: configObject.database.username as string,
  password: configObject.database.password as any,
  database: configObject.database.name as string,
  entities: [path.join(__dirname, '..', 'database', 'entities', '*.entity.{ts,js}')],
  migrations: [path.join(__dirname, '..', 'database', 'migrations', '*-migration.{ts,js}')],
  synchronize: configObject.database.synchronize,
  //logging: configObject.database.logging === 'true',
};

// For migrations, export the DataSource directly
const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource;

// For App Module
export const moduleOptions = async (configService: ConfigService): Promise<TypeOrmModuleOptions> => {
  return ({
    type: configService.get('database.type') as any,
    host: configService.get<string>('database.host'),
    port: configService.get<number>('database.port'),
    username: configService.get<string>('database.username'),
    password: configService.get('database.password'),
    database: configService.get<string>('database.name'),
    entities: ['dist/database/entities/*.entity.js', 'src/database/entities/*.entity.ts'],
    autoLoadEntities: configService.get<boolean>('database.autoload'),
    migrations: ['src/database/migrations/*-migration.ts', 'dist/database/migration/*-migration.ts'],
    synchronize: configService.get<boolean>('database.synchronize'),
    logging: configService.get<boolean>('database.logging') === true,
    migrationsRun: configService.get<boolean>('database.runMigrationsOnStart') === true,

  });
};



