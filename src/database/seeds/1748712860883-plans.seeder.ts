import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { Plan } from '../entities/plans.entity';

export class PlansSeeder1748712860883 implements Seeder {
  track = false;

  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager): Promise<any> {
    const repository = dataSource.getRepository(Plan);
    repository.insert([
      {
        name: 'Trial',
        price: 0,
        credits: 50,
        status: true,
      },
      {
        name: 'Basic',
        price: 5.29,
        credits: 500,
        status: true,
      },
      {
        name: 'Advanced',
        price: 15.99,
        credits: 2000,
        status: true,
      },
      {
        name: 'Professional',
        price: 100,
        credits: 30000,
        status: true,
      },
    ]);
  }
}
