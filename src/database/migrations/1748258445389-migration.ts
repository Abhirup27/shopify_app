import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1748258445389 implements MigrationInterface {
    name = 'Migration1748258445389'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "product" ADD "category_id" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "product" ADD "inventoryTotal" integer NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "inventoryTotal"`);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "category_id"`);
    }

}
