import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';
import { Product } from './product.entity';
import { Order } from './order.entity';
import { Customer } from './customer.entity';
import { StoreLocations } from './storeLocations.entity';

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
  })
  id: number;

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
}
