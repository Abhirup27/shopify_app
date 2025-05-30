import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1748520497902 implements MigrationInterface {
    name = 'Migration1748520497902'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "store" ADD "created_at_date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "store" DROP COLUMN "created_at_date"`);
    }

}
