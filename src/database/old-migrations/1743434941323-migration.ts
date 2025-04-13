import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1743434941323 implements MigrationInterface {
    name = 'Migration1743434941323'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`store_locations\` (\`id\` bigint UNSIGNED NOT NULL, \`store_id\` int UNSIGNED NOT NULL, \`name\` varchar(255) NULL, \`address1\` varchar(255) NOT NULL, \`address2\` varchar(255) NULL, \`city\` tinytext NOT NULL, \`zip\` varchar(255) NULL, \`province\` varchar(255) NOT NULL, \`country\` varchar(255) NOT NULL, \`phone\` varchar(255) NULL, \`created_at\` datetime NULL, \`updated_at\` datetime NULL, \`country_code\` varchar(255) NULL, \`province_code\` varchar(255) NULL, \`country_name\` varchar(255) NULL, \`legacy\` varchar(255) NULL, \`active\` varchar(255) NULL, \`admin_graphql_api_id\` varchar(255) NULL, \`localized_country_name\` varchar(255) NULL, \`localized_province_name\` varchar(255) NULL, \`created_at_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`store_locations\` ADD CONSTRAINT \`FK_a4297f4ed3823a61de6a0d4263f\` FOREIGN KEY (\`store_id\`) REFERENCES \`store\`(\`table_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`store_locations\` DROP FOREIGN KEY \`FK_a4297f4ed3823a61de6a0d4263f\``);
        await queryRunner.query(`DROP TABLE \`store_locations\``);
    }

}
