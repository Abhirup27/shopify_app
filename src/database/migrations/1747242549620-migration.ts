import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1747242549620 implements MigrationInterface {
    name = 'Migration1747242549620'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "product_type" ADD "name" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "product_type" ADD "isRoot" boolean NOT NULL`);
        await queryRunner.query(`ALTER TABLE "product_type" ADD "isLeaf" boolean NOT NULL`);
        await queryRunner.query(`ALTER TABLE "product_type" ADD "level" smallint NOT NULL`);
        await queryRunner.query(`ALTER TABLE "product_type" ADD "parentId" character varying`);
        await queryRunner.query(`ALTER TABLE "product_type" ADD "childrenIds" character varying array`);
        await queryRunner.query(`ALTER TABLE "product_type" ALTER COLUMN "fullName" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "product_type" ADD CONSTRAINT "FK_b368d19928988a4877e2681881d" FOREIGN KEY ("parentId") REFERENCES "product_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "product_type" DROP CONSTRAINT "FK_b368d19928988a4877e2681881d"`);
        await queryRunner.query(`ALTER TABLE "product_type" ALTER COLUMN "fullName" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "product_type" DROP COLUMN "childrenIds"`);
        await queryRunner.query(`ALTER TABLE "product_type" DROP COLUMN "parentId"`);
        await queryRunner.query(`ALTER TABLE "product_type" DROP COLUMN "level"`);
        await queryRunner.query(`ALTER TABLE "product_type" DROP COLUMN "isLeaf"`);
        await queryRunner.query(`ALTER TABLE "product_type" DROP COLUMN "isRoot"`);
        await queryRunner.query(`ALTER TABLE "product_type" DROP COLUMN "name"`);
    }

}
