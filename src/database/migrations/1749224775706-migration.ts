import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1749224775706 implements MigrationInterface {
    name = 'Migration1749224775706'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "store_plan" ADD "status" character varying NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "store_plan" DROP COLUMN "status"`);
    }

}
