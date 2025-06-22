import { Column, Entity, OneToMany, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';
import { Store } from './store.entity';
import { UserStore } from './userstore.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    unsigned: true,
  })
  user_id: number;

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
    length: 98,
    nullable: false,
  })
  password: string;

  @Column({ type: 'varchar', length: 15, nullable: true })
  phone?: string;

  @Column({ type: 'boolean', nullable: true })
  twoFA?: boolean;

  @Column({
    type: 'timestamp',
  })
  email_verified_at: string | Date;

  @OneToMany(() => Store, store => store.user)
  stores: Store[];
  @OneToMany(() => UserStore, userstore => userstore.user)
  userStores: UserStore[];
}
