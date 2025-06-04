import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1749005859213 implements MigrationInterface {
    name = 'Migration1749005859213'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "store_plan" ("id" SERIAL NOT NULL, "store_id" bigint NOT NULL, "plan_id" integer NOT NULL, "credits" double precision NOT NULL, "price" double precision NOT NULL, "user_id" bigint NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "REL_8a09b181e1a5072c7bdb31d1a9" UNIQUE ("store_id"), CONSTRAINT "REL_f438df812e971efaf826f008ab" UNIQUE ("plan_id"), CONSTRAINT "PK_b6827d7716d3ba4832d3b70fc29" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "store_plan" ADD CONSTRAINT "FK_8a09b181e1a5072c7bdb31d1a9b" FOREIGN KEY ("store_id") REFERENCES "store"("table_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "store_plan" ADD CONSTRAINT "FK_f438df812e971efaf826f008abb" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "store_plan" ADD CONSTRAINT "FK_410c68d4f0f6426dbb7da61ef2e" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "store_plan" DROP CONSTRAINT "FK_410c68d4f0f6426dbb7da61ef2e"`);
        await queryRunner.query(`ALTER TABLE "store_plan" DROP CONSTRAINT "FK_f438df812e971efaf826f008abb"`);
        await queryRunner.query(`ALTER TABLE "store_plan" DROP CONSTRAINT "FK_8a09b181e1a5072c7bdb31d1a9b"`);
        await queryRunner.query(`DROP TABLE "store_plan"`);
    }

}
