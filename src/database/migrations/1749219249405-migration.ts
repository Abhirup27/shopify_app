import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1749219249405 implements MigrationInterface {
    name = 'Migration1749219249405'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "store_plan" ADD "last_charge_id" bigint`);
        await queryRunner.query(`ALTER TABLE "store_plan" ADD "charge_history" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "store_plan" DROP COLUMN "charge_history"`);
        await queryRunner.query(`ALTER TABLE "store_plan" DROP COLUMN "last_charge_id"`);
    }

}
