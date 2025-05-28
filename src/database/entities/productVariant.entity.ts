import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Product } from './product.entity';

export interface InventoryLevel {
  id: number;
  location: {
    id: number;
    isActive: boolean;
  };
  quantities: Array<{
    id: number;
    name: string;
    quantity: number;
    updatedAt: string;
  }>;
}

@Entity()
export class ProductVariant {
  @PrimaryColumn({
    type: 'bigint',
    unsigned: true,
  })
  id: number;

  @Column({
    type: 'bigint',
    unsigned: true,
  })
  product_id: number;

  @ManyToOne(() => Product, { nullable: false, onDelete: 'CASCADE', cascade: ['remove'] })
  @JoinColumn({ name: 'product_id', referencedColumnName: 'id' })
  product: Product;

  @Column({ type: 'text', nullable: false })
  title: string;
  @Column({ type: 'text', nullable: false })
  displayName: string;

  @Column({ type: 'float', unsigned: true })
  price: number;

  @Column({ type: 'varchar', nullable: true })
  sku: string;

  @Column({ type: 'integer', unsigned: true })
  inventoryQuantity: number;

  @Column({ type: 'float', nullable: true })
  compareAtPrice: number;

  @Column({
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  inventory_item_id: number;

  @Column({ type: 'varchar', nullable: true })
  inventory_item_sku: string;

  @Column({ type: 'timestamp', nullable: true })
  inventory_item_created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  inventory_item_updated_at: Date;

  @Column({ type: 'json', nullable: true })
  inventory_levels: Array<InventoryLevel>;

  @Column({ type: 'timestamp' })
  createdAt: Date;

  @Column({ type: 'timestamp' })
  updatedAt: Date;
}
