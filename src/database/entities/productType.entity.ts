import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class ProductType {
  @PrimaryColumn({
    type: 'varchar',
    nullable: false,
  })
  id: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  name: string;
}
