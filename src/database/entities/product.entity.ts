import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Store } from './store.entity';
import { isArray } from 'class-validator';
import { ConfigService } from '@nestjs/config';
import { ProductVariant } from './productVariant.entity';

@Entity()
export class Product {
  // constructor(private readonly configService: ConfigService) { }
  @PrimaryColumn({
    type: 'bigint',
    unsigned: true,
  })
  id: number;

  @Column({
    type: 'integer',
    unsigned: true,
  })
  store_id: number;

  @ManyToOne(() => Store, { nullable: false })
  @JoinColumn({ name: 'store_id', referencedColumnName: 'table_id' })
  store: Store;

  @OneToMany(() => ProductVariant, variant => variant.product)
  variants: ProductVariant[];

  @Column({
    type: 'text',
    nullable: false,
  })
  title: string;

  @Column({ type: 'varchar', nullable: false })
  category_id: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  vendor: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  body_html: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  handle: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  product_type: string;

  @Column({
    type: 'timestamp',
    nullable: false,
  })
  created_at: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  updated_at: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  published_at: Date;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  tags: string;

  @Column({
    type: 'json',
    nullable: true,
  })
  options: string[];

  @Column({
    type: 'json',
    nullable: true,
  })
  images: string[];

  @Column({
    type: 'varchar',
    nullable: false,
  })
  admin_graphql_api_id: string;

  @Column({
    type: 'integer',
    nullable: false,
  })
  inventoryTotal: number;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    //default: () => 'CURRENT_TIMESTAMP'
  })
  created_at_date: Date;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    // default: () => 'CURRENT_TIMESTAMP',
    // onUpdate: 'CURRENT_TIMESTAMP'
  })
  updated_at_date: Date;

  public getAddToCartStatus = (): { status: boolean; message: string } => {
    const targetTag: string = 'buy-now'; //this.configService.get<string>('AddToCartTagProduct') ?? 'buy-now';
    if (this.tags.length > 0) {
      const tags: Array<string> = this.tags.split(',');

      if (tags !== null && this.isArray(tags)) {
        if (tags.includes(targetTag)) {
          return {
            status: true,
            message: 'Enable Add to Cart',
          };
        }
      }
    }
    return { status: false, message: 'Remove add to cart.' };
  };

  public isArray(array: unknown): array is string[] {
    return Array.isArray(array) && array.every(item => typeof item === 'string');
  }
}
