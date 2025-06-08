import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1749406842663 implements MigrationInterface {
    name = 'Migration1749406842663'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "store" ADD "installationId" bigint`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "store" DROP COLUMN "installationId"`);
    }

}
