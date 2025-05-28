import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'subscriptions' })
export class Subscription {
  @PrimaryGeneratedColumn('increment', { type: 'integer', unsigned: true })
  id: number;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  stripe_plan_id: string;

  @Column({
    type: 'float',
    nullable: true,
    unsigned: true,
  })
  price: number;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  name: string;

  @Column({
    type: 'float',
    unsigned: true,
    nullable: true,
  })
  credits: number;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    //default: () => 'CURRENT_TIMESTAMP'
  })
  created_at_date: Date;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    // default: () => 'CURRENT_TIMESTAMP',
    // onUpdate: 'CURRENT_TIMESTAMP'
  })
  updated_at_date: Date;
}
