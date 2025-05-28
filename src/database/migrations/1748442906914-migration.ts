import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1748442906914 implements MigrationInterface {
  name = 'Migration1748442906914';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "subscriptions" ("id" SERIAL NOT NULL, "stripe_plan_id" character varying, "price" double precision, "name" character varying, "credits" double precision, "created_at_date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at_date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "subscriptions"`);
  }
}
