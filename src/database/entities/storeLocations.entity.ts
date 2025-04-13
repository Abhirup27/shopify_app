import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { Store } from './store.entity';

@Entity()
export class StoreLocations {
  @PrimaryColumn({
    type: 'bigint',
    unsigned: true,
  })
  id: number;

  @Column({
    type: 'bigint',
    unsigned: true,
  })
  store_id: number;

  @ManyToOne(() => Store, { nullable: false })
  @JoinColumn({ name: 'store_id', referencedColumnName: 'table_id' })
  store: Store;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  name: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  address1: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  address2?: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  city: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  zip?: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  province: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  country: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  phone: string;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  created_at: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  updated_at: Date;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  country_code: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  province_code: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  country_name: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  legacy?: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  active: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  admin_graphql_api_id?: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  localized_country_name: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  localized_province_name: string;

  @CreateDateColumn({
    type: 'timestamp with time zone',
  })
  created_at_date?: Date;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
  })
  updated_at_datei?: Date;
}
