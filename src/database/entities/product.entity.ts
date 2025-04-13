import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Store } from './store.entity';
import { isArray } from 'class-validator';
import { ConfigService } from '@nestjs/config';

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

  @Column({
    type: 'text',
    nullable: false,
  })
  title: string;

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
  variants: string[];

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

  /**
              public getAddToCartStatus = async (): Promise<{ status: boolean, message: string }> => {
                  const targetTag: string = 'buy-now'//this.configService.get<string>('AddToCartTagProduct') ?? 'buy-now';
                  if (this.tags.length > 0) {
                      const tags: Array<string> = this.tags.split(',');
          
                      if (tags !== null && this.isArray(tags)) {
                          if (tags.includes(targetTag)) {
                              return Promise.resolve({
                                  status: true,
                                  message: 'Enable Add to Cart'
                              });
                          }
          
                      }
                  }
                  return Promise.resolve({ status: false, message: 'Remove add to cart.' });
              }
          
          
          
          
              isArray(array: unknown): array is string[] {
          
                  return Array.isArray(array) && array.every(item => typeof item === 'string');
              }
          **/
}
