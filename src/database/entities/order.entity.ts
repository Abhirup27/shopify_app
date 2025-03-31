import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, PrimaryColumn, DataSource } from "typeorm";
import { Store } from "./store.entity";

@Entity('orders')
export class Order {
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

    @Column({ type: 'varchar', nullable: true })
    cancel_reason: string;

    @Column({ type: 'datetime', nullable: true })
    cancelled_at: Date;

    @Column({ type: 'varchar', nullable: true })
    cart_token: string;

    @Column({ type: 'varchar', nullable: true })
    checkout_id: string;

    @Column({ type: 'varchar', nullable: true })
    checkout_token: string;

    @Column({ type: 'varchar', nullable: true })
    contact_email: string;

    @Column({ type: 'datetime', nullable: true })
    created_at: Date;

    @Column({ type: 'varchar', length: 3, nullable: true })
    currency: string;

    @Column({ type: 'json', nullable: true })
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

    @Column({ type: 'text', nullable: true })
    note: string;

    @Column({ type: 'varchar', nullable: true })
    order_number: string;

    @Column({ type: 'varchar', nullable: true })
    order_status_url: string;

    @Column({ type: 'varchar', nullable: true })
    phone: string;

    @Column({ type: 'json', nullable: true })
    tax_lines: string;

    @Column({ type: 'int', nullable: false })
    quantity: string;
        
    @Column({ type: 'json', nullable: true })
    subtotal_price_set: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    subtotal_price: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    total_line_items_price: string;

    @Column({ type: 'json', nullable: true })
    total_discounts_set: string;

    @Column({ type: 'boolean', nullable: true })
    taxes_included: boolean;

    @Column({ type: 'boolean', nullable: true })
    test: boolean;

    @Column({ type: 'json', nullable: true })
    tags: string;
    
    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    total_discounts: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    total_price: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    total_price_usd: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    total_tax: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    total_tip_received: string;


    @Column({ type: 'datetime', nullable: true })
    updated_at: Date;

    @Column({ type: 'datetime', nullable: true })
    processed_at: Date;

    @Column({ type: 'datetime', nullable: true })
    closed_at: Date;

    @Column({ type: 'json', nullable: true })
    billing_address: string;

    @Column({ type: 'json', nullable: true })
    customer: string;

    @Column({ type: 'json', nullable: true })
    fulfillments: string;

    @Column({ type: 'json', nullable: true })
    line_items: string;

    @Column({ type: 'json', nullable: true })
    shipping_address: string;

    @Column({ type: 'json', nullable: true })
    shipping_lines: string;

    @Column({ type: 'json', nullable: true })
    payment_details: string;

    @Column({ type: 'varchar', nullable: true })
    ship_country: string;

    @Column({ type: 'varchar', nullable: true })
    ship_province: string;

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

    static async getTotalPriceByStoreId(storeId: number, dataSource: DataSource): Promise<number> {
        const orderRepository = dataSource.getRepository(Order);
        
        const result = await orderRepository
            .createQueryBuilder("order")
            .select("SUM(order.total_price)", "sum")
            .where("order.store_id = :storeId", { storeId })
            .getRawOne();
            
        return result.sum ? parseFloat(result.sum) : 0;
    }
}