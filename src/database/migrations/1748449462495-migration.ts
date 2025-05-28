import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1748449462495 implements MigrationInterface {
    name = 'Migration1748449462495'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "customer" DROP CONSTRAINT "PK_71c93a3c6013a2c84339ec1d7a9"`);
        await queryRunner.query(`ALTER TABLE "customer" DROP COLUMN "table_id"`);
        await queryRunner.query(`ALTER TABLE "customer" ADD CONSTRAINT "PK_c4810e00188c21f4bec3c14400e" PRIMARY KEY ("id", "store_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "customer" DROP CONSTRAINT "PK_c4810e00188c21f4bec3c14400e"`);
        await queryRunner.query(`ALTER TABLE "customer" ADD "table_id" BIGSERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "customer" ADD CONSTRAINT "PK_71c93a3c6013a2c84339ec1d7a9" PRIMARY KEY ("table_id")`);
    }

}
