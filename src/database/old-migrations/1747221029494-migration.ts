import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1747221029494 implements MigrationInterface {
    name = 'Migration1747221029494'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "product_type" ALTER COLUMN "fullName" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "product_type" ALTER COLUMN "fullName" SET NOT NULL`);
    }

}
