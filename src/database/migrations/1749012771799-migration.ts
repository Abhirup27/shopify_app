import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1749012771799 implements MigrationInterface {
    name = 'Migration1749012771799'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "store_plan" DROP CONSTRAINT "FK_8a09b181e1a5072c7bdb31d1a9b"`);
        await queryRunner.query(`ALTER TABLE "store" ADD CONSTRAINT "UQ_f3172007d4de5ae8e7692759d79" UNIQUE ("id")`);
        await queryRunner.query(`ALTER TABLE "store_plan" ADD CONSTRAINT "FK_8a09b181e1a5072c7bdb31d1a9b" FOREIGN KEY ("store_id") REFERENCES "store"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "store_plan" DROP CONSTRAINT "FK_8a09b181e1a5072c7bdb31d1a9b"`);
        await queryRunner.query(`ALTER TABLE "store" DROP CONSTRAINT "UQ_f3172007d4de5ae8e7692759d79"`);
        await queryRunner.query(`ALTER TABLE "store_plan" ADD CONSTRAINT "FK_8a09b181e1a5072c7bdb31d1a9b" FOREIGN KEY ("store_id") REFERENCES "store"("table_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
