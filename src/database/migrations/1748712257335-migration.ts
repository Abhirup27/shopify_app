import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1748712257335 implements MigrationInterface {
    name = 'Migration1748712257335'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "plan" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "price" double precision NOT NULL, "credits" double precision NOT NULL, "status" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_54a2b686aed3b637654bf7ddbb3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_plan" ("id" SERIAL NOT NULL, "user_id" bigint NOT NULL, "plan_id" integer NOT NULL, "credits" double precision NOT NULL, "price" double precision NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "REL_5a8dd225812b1927bc8bc60632" UNIQUE ("user_id"), CONSTRAINT "REL_ab1f08d687398cd4762faad469" UNIQUE ("plan_id"), CONSTRAINT "PK_aa22a94c276c9921fe6590c1557" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "user_plan" ADD CONSTRAINT "FK_5a8dd225812b1927bc8bc60632c" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_plan" ADD CONSTRAINT "FK_ab1f08d687398cd4762faad4690" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_plan" DROP CONSTRAINT "FK_ab1f08d687398cd4762faad4690"`);
        await queryRunner.query(`ALTER TABLE "user_plan" DROP CONSTRAINT "FK_5a8dd225812b1927bc8bc60632c"`);
        await queryRunner.query(`DROP TABLE "user_plan"`);
        await queryRunner.query(`DROP TABLE "plan"`);
    }

}
