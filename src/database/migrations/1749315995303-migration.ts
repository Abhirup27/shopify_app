import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1749315995303 implements MigrationInterface {
    name = 'Migration1749315995303'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "store_plan" DROP COLUMN "last_charge_id"`);
        await queryRunner.query(`ALTER TABLE "store_plan" ADD "last_charge_id" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "store_plan" DROP COLUMN "last_charge_id"`);
        await queryRunner.query(`ALTER TABLE "store_plan" ADD "last_charge_id" bigint`);
    }

}
