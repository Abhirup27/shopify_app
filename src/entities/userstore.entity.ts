import { Column, Entity, JoinColumn, ManyToMany, ManyToOne, PrimaryColumn } from "typeorm";
import { User } from "./user.entity";
import { Store } from "./store.entity";


@Entity()
export class UserStore{

    @PrimaryColumn({
        type: 'bigint',
        unsigned: true,
        nullable: false
        })
        user_id: number;
    
    @ManyToOne(() => User, { nullable: false })
    @JoinColumn({ name: 'user_id', referencedColumnName: 'user_id' })
    user: User;
    

    @PrimaryColumn({
        type: 'integer',
        unsigned: true,
        nullable: false
    })
    store_id: number;
    @ManyToOne(() => Store, { nullable: false })
    @JoinColumn({ name: 'store_id', referencedColumnName: 'table_id' })
    store: Store;

     @Column('simple-array')
        roles: string[];
    
    @Column('simple-array')
        permissions: string[];
}