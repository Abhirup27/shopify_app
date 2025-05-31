import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Plan } from './plans.entity';
import { User } from './user.entity';

@Entity()
export class UserPlan {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'bigint', unsigned: true })
  user_id: number;

  @OneToOne(() => User, { nullable: false, onDelete: 'CASCADE', cascade: ['remove'] })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'user_id' })
  user: User;

  @Column({ type: 'integer', unsigned: true })
  plan_id: number;

  @OneToOne(() => Plan, { nullable: false, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'plan_id', referencedColumnName: 'id' })
  plan: Plan;

  @Column({ type: 'float', unsigned: true, nullable: false })
  credits: number;

  @Column({ type: 'float', nullable: false, unsigned: true })
  price: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
