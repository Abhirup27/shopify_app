import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Store } from './store.entity';

@Entity('customer')
export class Customer {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  table_id: number;

  @Column({ type: 'bigint', unsigned: true, nullable: false })
  id: number;

  @Column({ type: 'bigint', unsigned: true, nullable: false })
  store_id: number;

  @ManyToOne(() => Store)
  @JoinColumn({ name: 'store_id', referencedColumnName: 'table_id' })
  store: Store;

  @Column({ type: 'varchar', nullable: true })
  email: string;

  @Column({ type: 'json', nullable: true })
  accepts_marketing: JSON;

  @Column({ type: 'varchar', nullable: true })
  created_at: string;

  @Column({ type: 'varchar', nullable: true })
  updated_at: string;

  @Column({ type: 'varchar', nullable: true })
  first_name: string;

  @Column({ type: 'varchar', nullable: true })
  last_name: string;

  @Column({ type: 'float', nullable: true })
  orders_count: number;

  @Column({ type: 'varchar', nullable: true })
  phone: string;

  @Column({ type: 'varchar', nullable: true })
  currency: string;

  @Column({ type: 'varchar', nullable: true })
  admin_graphql_api_id: string;

  @Column({ type: 'json', nullable: true })
  default_address: JSON;

  @Column({ type: 'varchar', nullable: true })
  tags: string;
@CreateDateColumn({
        type: 'timestamp',
        //default: () => 'CURRENT_TIMESTAMP'
    })
    created_at_date: Date;

    @UpdateDateColumn({
        type: 'timestamp',
        // default: () => 'CURRENT_TIMESTAMP',
        // onUpdate: 'CURRENT_TIMESTAMP'
    })
    updated_at_date: Date;
}