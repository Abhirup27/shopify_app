import { DataSource, DataSourceOptions } from 'typeorm';
import { SeederOptions } from 'typeorm-extension';
import { dataSourceOptions } from './typeorm.config';
import * as path from 'path';
const options: DataSourceOptions & SeederOptions = {
  ...dataSourceOptions,
  seeds: [path.join(__dirname, 'seeds', '*.seeder.{ts,js}')],
};

export const dataSource = new DataSource(options);
