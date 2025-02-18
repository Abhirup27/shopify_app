import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Store } from "./store.entity";

@Entity('orders')
export class Order {
    @PrimaryGeneratedColumn({
        type: 'bigint',
        unsigned: true
    })
    table_id: number;

    @Column({
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

    @Column({ type: 'varchar', nullable: true })
    cancel_reason: string;

    @Column({ type: 'varchar', nullable: true })
    cancelled_at: string;

    @Column({ type: 'varchar', nullable: true })
    cart_token: string;

    @Column({ type: 'varchar', nullable: true })
    checkout_id: string;

    @Column({ type: 'varchar', nullable: true })
    checkout_token: string;

    @Column({ type: 'varchar', nullable: true })
    contact_email: string;

    @Column({ type: 'varchar', nullable: true })
    created_at: string;

    @Column({ type: 'varchar', nullable: true })
    currency: string;

    @Column({ type: 'varchar', nullable: true })
    discount_codes: string;

    @Column({ type: 'varchar', nullable: true })
    email: string;

    @Column({ type: 'varchar', nullable: true })
    financial_status: string;

    @Column({ type: 'varchar', nullable: true })
    fulfillment_status: string;

    @Column({ type: 'varchar', nullable: true })
    gateway: string;

    @Column({ type: 'varchar', nullable: true })
    name: string;

    @Column({ type: 'varchar', nullable: true })
    note: string;

    @Column({ type: 'varchar', nullable: true })
    order_number: string;

    @Column({ type: 'varchar', nullable: true })
    order_status_url: string;

    @Column({ type: 'varchar', nullable: true })
    phone: string;

    @Column({ type: 'text', nullable: true })
    tax_lines: string;

    @Column({ type: 'text', nullable: true })
    subtotal_price_set: string;

    @Column({ type: 'varchar', nullable: true })
    subtotal_price: string;

    @Column({ type: 'text', nullable: true })
    total_line_items_price: string;

    @Column({ type: 'text', nullable: true })
    total_discounts_set: string;

    @Column({ type: 'varchar', nullable: true })
    taxes_included: string;

    @Column({ type: 'varchar', nullable: true })
    test: string;

    @Column({ type: 'varchar', nullable: true })
    total_discounts: string;

    @Column({ type: 'varchar', nullable: true })
    total_price: string;

    @Column({ type: 'varchar', nullable: true })
    total_price_usd: string;

    @Column({ type: 'varchar', nullable: true })
    total_tax: string;

    @Column({ type: 'varchar', nullable: true })
    total_tip_received: string;

    @Column({ type: 'varchar', nullable: true })
    updated_at: string;

    @Column({ type: 'text', nullable: true })
    billing_address: string;

    @Column({ type: 'text', nullable: true })
    customer: string;

    @Column({ type: 'text', nullable: true })
    fulfillments: string;

    @Column({ type: 'text', nullable: true })
    line_items: string;

    @Column({ type: 'text', nullable: true })
    shipping_address: string;

    @Column({ type: 'text', nullable: true })
    shipping_lines: string;

    @Column({ type: 'text', nullable: true })
    payment_details: string;

    @Column({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP'
    })
    created_at_date: Date;

    @Column({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP'
    })
    updated_at_date: Date;
}