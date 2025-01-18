import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";


@Entity()
export class User{

    @PrimaryGeneratedColumn({
        type: 'bigint',
        unsigned: true
    })
    user_id: number;

    @Column({
        type: 'varchar',
        length: 96,
        nullable: false
    })
    name: string;

    @Column({
        type: 'varchar',
        length: 254,
        nullable: false
    })
    email: string;

    @Column({
        type: 'varchar',
        length: 98,
        nullable: false
    })
    password: string;
    
    @Column({type:'tinytext', nullable:true})
    stripe_id: string;

    @Column({
        type: 'datetime'
    })
    email_verified_at: string | Date;

}