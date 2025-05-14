import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1747244040261 implements MigrationInterface {
    name = 'Migration1747244040261'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "product_type" ADD CONSTRAINT "CHK_6a01c7dfcfdb727ce075c16ac5" CHECK ("parentId" IS NULL OR "parentId" <> id)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "product_type" DROP CONSTRAINT "CHK_6a01c7dfcfdb727ce075c16ac5"`);
    }

}
