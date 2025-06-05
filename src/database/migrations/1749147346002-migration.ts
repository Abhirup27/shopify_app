import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1749147346002 implements MigrationInterface {
    name = 'Migration1749147346002'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "store" ADD "allowOfflineToken" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "user_store" ADD "user_access_token" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_store" DROP COLUMN "user_access_token"`);
        await queryRunner.query(`ALTER TABLE "store" DROP COLUMN "allowOfflineToken"`);
    }

}
