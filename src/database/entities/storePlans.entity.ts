import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Plan } from './plans.entity';
import { User } from './user.entity';
import { Store } from './store.entity';

@Entity()
export class StorePlan {
  @PrimaryGeneratedColumn('increment')
  id?: number;

  @Column({ type: 'bigint', unsigned: true })
  store_id: number;

  @OneToOne(() => Store, { nullable: false, onDelete: 'NO ACTION', cascade: true })
  @JoinColumn({ name: 'store_id', referencedColumnName: 'id' }) //because if the store gets deleted and reinstalled, we want to be able to identify it again
  store?: Store;

  @Column({ type: 'integer', unsigned: true })
  plan_id: number;

  @OneToOne(() => Plan, { nullable: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'plan_id', referencedColumnName: 'id' })
  plan?: Plan;

  @Column({ type: 'float', unsigned: true, nullable: false })
  credits: number;

  @Column({ type: 'float', nullable: false, unsigned: true })
  price: number;

  @Column({ type: 'bigint', unsigned: true })
  user_id: number;
  @ManyToOne(() => User, { nullable: false, onDelete: 'NO ACTION', cascade: true })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'user_id' })
  user?: User;
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt?: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt?: Date;
}
