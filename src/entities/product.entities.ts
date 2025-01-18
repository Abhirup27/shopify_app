import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class Product{
    @PrimaryColumn({
        type: 'bigint',
        unsigned: true
    })
    id: number;

    @Column({
        type: 'bigint',
        unsigned: true
    })
    store_id: number;

    @Column({
        type: 'mediumtext',
        nullable: false
    })
    title: string;

    @Column({
        type: 'mediumtext',
        nullable: false
    })
    body_html: string;

    @Column({
        type: 'varchar',
        nullable: false
    })
    vendor: string;


}