import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1748270191631 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<void> {
   
    await queryRunner.query(`
      ALTER TABLE "product_variant" 
      DROP CONSTRAINT "FK_ca67dd080aac5ecf99609960cd2" 
    `);

    //foreign key with ON DELETE CASCADE
    await queryRunner.query(`
      ALTER TABLE "product_variant" 
      ADD CONSTRAINT "FK_ca67dd080aac5ecf99609960cd2" 
      FOREIGN KEY ("product_id") 
      REFERENCES "product"("id") 
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
   
    await queryRunner.query(`
      ALTER TABLE "product_variant" 
      DROP CONSTRAINT "FK_ca67dd080aac5ecf99609960cd2"
    `);

    await queryRunner.query(`
      ALTER TABLE "product_variant" 
      ADD CONSTRAINT "FK_ca67dd080aac5ecf99609960cd2" 
      FOREIGN KEY ("product_id") 
      REFERENCES "product"("id") 
      ON DELETE NO ACTION
    `);
  }

}
