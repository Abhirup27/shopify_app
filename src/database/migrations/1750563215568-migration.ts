import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1750563215568 implements MigrationInterface {
    name = 'Migration1750563215568'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "twoFA" boolean`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "twoFA"`);
    }

}
