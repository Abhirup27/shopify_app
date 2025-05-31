import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { UserPlan } from './userPlans.entity';

@Entity()
export class Plan {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'float', unsigned: true, nullable: false })
  price: number;
  @Column({ type: 'float', unsigned: true, nullable: false })
  credits: number;
  @Column({ type: 'boolean', default: true })
  status?: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @OneToMany(() => UserPlan, userplan => userplan.plan)
  userplans: UserPlan[];
}
