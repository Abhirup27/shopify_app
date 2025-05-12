import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1747058141752 implements MigrationInterface {
    name = 'Migration1747058141752'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "product_type" ("id" character varying NOT NULL, "name" character varying NOT NULL, CONSTRAINT "PK_e0843930fbb8854fe36ca39dae1" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "product_type"`);
    }

}
