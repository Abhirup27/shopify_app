import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1750562701747 implements MigrationInterface {
    name = 'Migration1750562701747'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" RENAME COLUMN "stripe_id" TO "phone"`);
        await queryRunner.query(`ALTER TABLE "store" ADD "stripe_id" text`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "phone"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "phone" character varying(15)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "phone"`);
        await queryRunner.query(`ALTER TABLE "user" ADD "phone" text`);
        await queryRunner.query(`ALTER TABLE "store" DROP COLUMN "stripe_id"`);
        await queryRunner.query(`ALTER TABLE "user" RENAME COLUMN "phone" TO "stripe_id"`);
    }

}
