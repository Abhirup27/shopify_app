import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1748183382540 implements MigrationInterface {
    name = 'Migration1748183382540'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "product" ("id" bigint NOT NULL, "store_id" bigint NOT NULL, "title" text NOT NULL, "vendor" character varying, "body_html" text, "handle" character varying, "product_type" character varying, "created_at" TIMESTAMP NOT NULL, "updated_at" TIMESTAMP, "published_at" TIMESTAMP, "tags" character varying, "variants" json, "options" json, "images" json, "admin_graphql_api_id" character varying NOT NULL, "created_at_date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at_date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_bebc9158e480b949565b4dc7a82" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "orders" ("id" bigint NOT NULL, "store_id" bigint NOT NULL, "cancel_reason" character varying, "cancelled_at" TIMESTAMP, "cart_token" character varying, "checkout_id" character varying, "checkout_token" character varying, "contact_email" character varying, "created_at" TIMESTAMP, "currency" character varying(3), "discount_codes" json, "email" character varying, "financial_status" character varying, "fulfillment_status" character varying, "gateway" character varying, "name" character varying, "note" text, "order_number" character varying, "order_status_url" character varying, "phone" character varying, "tax_lines" json, "quantity" integer NOT NULL, "subtotal_price_set" json, "subtotal_price" numeric(10,2), "total_line_items_price" numeric(10,2), "total_discounts_set" json, "taxes_included" boolean, "test" boolean, "tags" json, "total_discounts" numeric(10,2), "total_price" numeric(10,2), "total_price_usd" numeric(10,2), "total_tax" numeric(10,2), "total_tip_received" numeric(10,2), "updated_at" TIMESTAMP, "processed_at" TIMESTAMP, "closed_at" TIMESTAMP, "billing_address" json, "customer" json, "fulfillments" json, "line_items" json, "shipping_address" json, "shipping_lines" json, "payment_details" json, "ship_country" character varying, "ship_province" character varying, "created_at_date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at_date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "customer" ("table_id" BIGSERIAL NOT NULL, "id" bigint NOT NULL, "store_id" bigint NOT NULL, "email" character varying, "accepts_marketing" jsonb, "created_at" character varying, "updated_at" character varying, "first_name" character varying, "last_name" character varying, "orders_count" double precision, "phone" character varying, "currency" character varying, "admin_graphql_api_id" character varying, "default_address" jsonb, "tags" character varying, "created_at_date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at_date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_71c93a3c6013a2c84339ec1d7a9" PRIMARY KEY ("table_id"))`);
        await queryRunner.query(`CREATE TABLE "store_locations" ("id" bigint NOT NULL, "store_id" bigint NOT NULL, "name" character varying, "address1" character varying, "address2" character varying, "city" character varying, "zip" character varying, "province" character varying, "country" character varying NOT NULL, "phone" character varying, "created_at" TIMESTAMP, "updated_at" TIMESTAMP, "country_code" character varying, "province_code" character varying, "country_name" character varying, "legacy" character varying, "active" character varying, "admin_graphql_api_id" character varying, "localized_country_name" character varying, "localized_province_name" character varying, "created_at_date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at_datei" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d72d2882d580218610800832547" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "store" ("table_id" BIGSERIAL NOT NULL, "id" bigint NOT NULL, "user_id" bigint NOT NULL, "name" character varying(96) NOT NULL, "email" character varying(254) NOT NULL, "access_token" character varying(40) NOT NULL, "api_key" character varying, "api_secret_key" character varying, "myshopify_domain" character varying NOT NULL, "phone" character varying(20), "address1" text, "address2" text, "zip" text, CONSTRAINT "UQ_df4c80aa3d63d99a6ed2f85dbec" UNIQUE ("myshopify_domain"), CONSTRAINT "PK_1090e4dbc3f7afbd961e604b130" PRIMARY KEY ("table_id"))`);
        await queryRunner.query(`CREATE TABLE "user_store" ("user_id" bigint NOT NULL, "store_id" bigint NOT NULL, "role" character varying NOT NULL, "permissions" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_fd548893a8245741f331a90674d" PRIMARY KEY ("user_id", "store_id"))`);
        await queryRunner.query(`CREATE TABLE "user" ("user_id" BIGSERIAL NOT NULL, "name" character varying(96) NOT NULL, "email" character varying(254) NOT NULL, "password" character varying(98) NOT NULL, "stripe_id" text, "email_verified_at" TIMESTAMP NOT NULL, CONSTRAINT "PK_758b8ce7c18b9d347461b30228d" PRIMARY KEY ("user_id"))`);
        await queryRunner.query(`CREATE TABLE "product_type" ("id" character varying NOT NULL, "fullName" character varying NOT NULL, "name" character varying NOT NULL, "isRoot" boolean NOT NULL, "isLeaf" boolean NOT NULL, "level" smallint NOT NULL, "parentId" character varying, "childrenIds" character varying array, CONSTRAINT "CHK_6a01c7dfcfdb727ce075c16ac5" CHECK ("parentId" IS NULL OR "parentId" <> id), CONSTRAINT "PK_e0843930fbb8854fe36ca39dae1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "product" ADD CONSTRAINT "FK_4fb20f5e0d195dcc2e27e8cc815" FOREIGN KEY ("store_id") REFERENCES "store"("table_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_b7a7bb813431fc7cd73cced0001" FOREIGN KEY ("store_id") REFERENCES "store"("table_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "customer" ADD CONSTRAINT "FK_30ea993af11b37670d9da1876d7" FOREIGN KEY ("store_id") REFERENCES "store"("table_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "store_locations" ADD CONSTRAINT "FK_a4297f4ed3823a61de6a0d4263f" FOREIGN KEY ("store_id") REFERENCES "store"("table_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "store" ADD CONSTRAINT "FK_1bb8bf0dd65b3e8298ef79640b7" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_store" ADD CONSTRAINT "FK_872d4d3d271ade5ea2da13d8997" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_store" ADD CONSTRAINT "FK_cb160b0156035796998473fad7e" FOREIGN KEY ("store_id") REFERENCES "store"("table_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "product_type" ADD CONSTRAINT "FK_b368d19928988a4877e2681881d" FOREIGN KEY ("parentId") REFERENCES "product_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "product_type" DROP CONSTRAINT "FK_b368d19928988a4877e2681881d"`);
        await queryRunner.query(`ALTER TABLE "user_store" DROP CONSTRAINT "FK_cb160b0156035796998473fad7e"`);
        await queryRunner.query(`ALTER TABLE "user_store" DROP CONSTRAINT "FK_872d4d3d271ade5ea2da13d8997"`);
        await queryRunner.query(`ALTER TABLE "store" DROP CONSTRAINT "FK_1bb8bf0dd65b3e8298ef79640b7"`);
        await queryRunner.query(`ALTER TABLE "store_locations" DROP CONSTRAINT "FK_a4297f4ed3823a61de6a0d4263f"`);
        await queryRunner.query(`ALTER TABLE "customer" DROP CONSTRAINT "FK_30ea993af11b37670d9da1876d7"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_b7a7bb813431fc7cd73cced0001"`);
        await queryRunner.query(`ALTER TABLE "product" DROP CONSTRAINT "FK_4fb20f5e0d195dcc2e27e8cc815"`);
        await queryRunner.query(`DROP TABLE "product_type"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "user_store"`);
        await queryRunner.query(`DROP TABLE "store"`);
        await queryRunner.query(`DROP TABLE "store_locations"`);
        await queryRunner.query(`DROP TABLE "customer"`);
        await queryRunner.query(`DROP TABLE "orders"`);
        await queryRunner.query(`DROP TABLE "product"`);
    }

}
