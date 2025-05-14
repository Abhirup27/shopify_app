import { Check, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

@Entity()
@Check(`"parentId" IS NULL OR "parentId" <> id`)
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
  fullName: string;

  @Column({
    type: 'varchar',
    nullable: false,
  })
  name: string;

  @Column({
    type: 'boolean',
    nullable: false,
  })
  isRoot: boolean;

  @Column({
    type: 'boolean',
    nullable: false,
  })
  isLeaf: boolean;

  @Column({
    type: 'smallint',
    nullable: false,
  })
  level: number;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  parentId?: string;

  @ManyToOne(() => ProductType, { nullable: true })
  @JoinColumn({ name: 'parentId', referencedColumnName: 'id' })
  parent: ProductType | null;

  @Column({
    type: 'varchar',
    array: true,
    nullable: true,
  })
  childrenIds?: string[];
}
