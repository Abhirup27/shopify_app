import { Column, Entity, JoinColumn, ManyToMany, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from './user.entity';
import { Store } from './store.entity';
import { IsArray, IsOptional, IsString } from 'class-validator';

@Entity()
export class UserStore {
  @PrimaryColumn({
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  user_id: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'user_id' })
  user: User;

  @PrimaryColumn({
    type: 'integer',
    unsigned: true,
    nullable: false,
  })
  store_id: number;
  @ManyToOne(() => Store, { nullable: false })
  @JoinColumn({ name: 'store_id', referencedColumnName: 'table_id' })
  store: Store;

  @Column({ type: 'varchar', nullable: false })
  role: string;

  @Column('simple-array')
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @Column({ type: 'varchar', nullable: true })
  user_access_token?: string;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at: Date;
  public isStorePrivate(): boolean | null {
    if (!this.store) return null;

    if (!(this.store instanceof Store)) {
      this.store = Object.assign(new Store(), this.store);
    }

    return this.store.IsPrivate();
  }
  // public hasRole(reqRole: string): boolean {
  //     return this.role === reqRole;
  // }

  // public can = async (reqPermissions: string[]): Promise<boolean> => {
  //     if (this.hasRole('all-access')) {
  //         return true;
  //     }

  //     if (!this.permissions) {
  //         return false;
  //     }

  //     // Check if user has any of the specified permissions
  //     return reqPermissions.some(permission =>
  //         this.permissions?.includes(permission)
  //     );
  // }
}
