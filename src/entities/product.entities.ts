import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Store } from "./store.entity";

@Entity()
export class Product {
    @PrimaryColumn({
        type: 'bigint',
        unsigned: true
    })
    id: number;

    @Column({
        type: 'integer',
        unsigned: true
    })
    store_id: number;

    @ManyToOne(() => Store, { nullable: false })
    @JoinColumn({ name: 'store_id', referencedColumnName: 'table_id' })
    store: Store;

    @Column({
        type: 'mediumtext',
        nullable: false
    })
    title: string;

    @Column({
        type: 'varchar',
        nullable: true
    })
    vendor: string;

    @Column({
        type: 'mediumtext',
        nullable: true
    })
    body_html: string;

    @Column({
        type: 'varchar',
        nullable: true
    })
    handle: string;

    @Column({
        type: 'varchar',
        nullable: true
    })
    product_type: string;

    @Column({
        type: 'datetime',
        nullable: false
    })
    created_at: Date;

    @Column({
        type: 'datetime',
        nullable: true
    })
    updated_at: Date;

    @Column({
        type: 'datetime',
        nullable: true
    })
    published_at: Date;

    @Column({
        type: 'varchar',
        nullable: true
    })
    tags: string;

    @Column({
        type: 'longtext',
        nullable: true
    })
    variants: string;

    @Column({
        type: 'longtext',
        nullable: true
    })
    options: string;

    @Column({
        type: 'longtext',
        nullable: true
    })
    images: string;

    @Column({
        type: 'varchar',
        nullable: false,
    })
    admin_graphql_api_id: string;
    @CreateDateColumn({
        type: 'timestamp',
        //default: () => 'CURRENT_TIMESTAMP'
    })
    created_at_date: Date;

    @UpdateDateColumn({
        type: 'timestamp',
        // default: () => 'CURRENT_TIMESTAMP',
        // onUpdate: 'CURRENT_TIMESTAMP'
    })
    updated_at_date: Date;
}