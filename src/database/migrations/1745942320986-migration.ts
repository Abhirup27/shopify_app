import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1745942320986 implements MigrationInterface {
    name = 'Migration1745942320986'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "store" ADD "api_key" character varying`);
        await queryRunner.query(`ALTER TABLE "store" ADD "api_secret_key" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "store" DROP COLUMN "api_secret_key"`);
        await queryRunner.query(`ALTER TABLE "store" DROP COLUMN "api_key"`);
    }

}
