import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Product } from './product.entity';
import { Order } from './order.entity';
import { Customer } from './customer.entity';
import { StoreLocations } from './storeLocations.entity';
import { StorePlan } from './storePlans.entity';

@Entity()
export class Store {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
  })
  table_id: number;

  @OneToMany(() => Customer, customer => customer.store)
  customers: Customer[];

  @OneToMany(() => Product, product => product.store)
  products: Product[];

  @OneToMany(() => Order, order => order.store)
  orders: Order[];

  @OneToMany(() => StoreLocations, location => location.store)
  storeLocations: StoreLocations[];

  @Column({
    type: 'bigint',
    unsigned: true,
    nullable: false,
    unique: true,
  })
  id: number;

  @OneToOne(() => StorePlan, storePlan => storePlan.store)
  storePlan: StorePlan;

  @Column({
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  user_id: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'user_id' })
  user: User;

  @Column({
    type: 'varchar',
    length: 96,
    nullable: false,
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 254,
    nullable: false,
  })
  email: string;

  @Column({
    type: 'varchar',
    length: 40,
  })
  access_token: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  allowOfflineToken?: boolean;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  api_key?: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  api_secret_key?: string;
  @Column({
    type: 'varchar',
    nullable: false,
    unique: true,
  })
  myshopify_domain: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  phone: string;

  @Column({ type: 'text', nullable: true })
  address1: string;

  @Column({ type: 'text', nullable: true })
  address2: string;

  @Column({ type: 'text', nullable: true })
  zip: string;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  installationId?: number;

  @Column({ type: 'text', nullable: true })
  stripe_id?: string;
  @CreateDateColumn({
    type: 'timestamp with time zone',
    //default: () => 'CURRENT_TIMESTAMP'
  })
  created_at_date: Date;

  public IsPrivate(): boolean {
    if (
      (this.api_key == undefined || this.api_key == null) &&
      (this.api_secret_key == undefined || this.api_secret_key == null)
    ) {
      return false;
    }
    return (
      'api_key' in this &&
      'api_secret_key' in this &&
      this.api_key !== null &&
      this.api_secret_key !== null &&
      this.api_key.length > 0 &&
      this.api_secret_key.length > 0
    );
  }
}
