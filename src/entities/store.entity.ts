import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Store {

    @PrimaryGeneratedColumn()
    table_id: number;

    @Column({
        type: 'bigint',
        nullable: false
    })
    id: number;
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
    @Column(
        {
            type: 'varchar',
            nullable: false,
            unique: true
        }
    )
    domain: string;

    @Column({type: 'text'})
    address1: string;
}