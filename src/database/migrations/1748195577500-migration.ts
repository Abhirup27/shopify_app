import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1748195577500 implements MigrationInterface {
    name = 'Migration1748195577500'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "product_variant" ("id" bigint NOT NULL, "product_id" bigint NOT NULL, "title" text NOT NULL, "displayName" text NOT NULL, "price" double precision NOT NULL, "sku" character varying, "inventoryQuantity" integer NOT NULL, "compareAtPrice" double precision, "inventory_item_id" bigint, "inventory_item_sku" character varying, "inventory_item_created_at" TIMESTAMP, "inventory_item_updated_at" TIMESTAMP, "inventory_levels" json, "createdAt" TIMESTAMP NOT NULL, "updatedAt" TIMESTAMP NOT NULL, CONSTRAINT "PK_1ab69c9935c61f7c70791ae0a9f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "variants"`);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD CONSTRAINT "FK_ca67dd080aac5ecf99609960cd2" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "product_variant" DROP CONSTRAINT "FK_ca67dd080aac5ecf99609960cd2"`);
        await queryRunner.query(`ALTER TABLE "product" ADD "variants" json`);
        await queryRunner.query(`DROP TABLE "product_variant"`);
    }

}
