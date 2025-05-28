import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { Subscription } from '../entities/subscription.entity';

export default class SubscriptionSeeder implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager): Promise<void> {
    await dataSource.query('TRUNCATE "subscriptions" RESTART IDENTITY;');

    const repository = dataSource.getRepository(Subscription);
    await repository.insert([
      {
        name: 'Basic',
        price: 9.99,
        credits: 500,
      },
      {
        name: 'Pro',
        price: 19.99,
        credits: 1500,
      },
    ]);
  }
}
