import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";

@Entity()
export class Store {

    @PrimaryGeneratedColumn({
        type: 'integer',
        unsigned: true
    })
    table_id: number;

    @Column({
        type: 'bigint',
        unsigned:true,
        nullable: false
    })
    id: number;

    @Column({
    type: 'bigint',
    unsigned: true,
    nullable: false
    })
    user_id: number;

    @ManyToOne(() => User, { nullable: false })
    @JoinColumn({ name: 'user_id', referencedColumnName: 'user_id' })
    user: User;
    
    @Column(
        {
            type: 'varchar',
            length: 96,
            nullable:false
        }
    )
    name: string;

    @Column(
        {
            type: 'varchar',
            length: 254,
            nullable:false
        }
    )
    email: string;

    @Column({
        type: 'varchar',
        length: 40
    })
    access_token: string;
    @Column(
        {
            type: 'varchar',
            nullable: false,
            unique: true
        }
    )
    myshopify_domain: string;

    @Column({
        type: 'varchar',
        length: 20,
        nullable:true
    })
    phone: string;
    
    @Column({type: 'text',nullable:true})
    address1: string;

    @Column({type: 'text',nullable:true})
    address2: string;

    @Column({type: 'tinytext',nullable:true})
    zip: string;
}