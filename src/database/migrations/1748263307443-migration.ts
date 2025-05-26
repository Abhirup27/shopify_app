import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1748263307443 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS table_metadata (
                table_name VARCHAR PRIMARY KEY,
                last_updated TIMESTAMP NOT NULL
            );
        `);

    // Create the function for updating timestamps
    await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_table_timestamp()
            RETURNS TRIGGER AS $$
            BEGIN
                INSERT INTO table_metadata (table_name, last_updated)
                VALUES (TG_TABLE_NAME, NOW())
                ON CONFLICT (table_name)
                DO UPDATE SET last_updated = NOW();
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

    // trigger for product_types table
    await queryRunner.query(`
            DROP TRIGGER IF EXISTS update_product_type_timestamp ON product_type;
            
            CREATE TRIGGER update_product_type_timestamp
            AFTER INSERT OR UPDATE OR DELETE ON product_type
            FOR EACH STATEMENT
            EXECUTE FUNCTION update_table_timestamp();
        `);

    /* await queryRunner.query(`
                            INSERT INTO table_metadata (table_name, last_updated)
                            VALUES ('product_type', NOW())
                            ON CONFLICT (table_name) DO NOTHING;
                        `);
                    */
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_product_type_timestamp ON product_type;`);

    // Only drop the function if no other tables use it
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_table_timestamp;`);

    // Remove the metadata entry for your table
    await queryRunner.query(`DELETE FROM table_metadata WHERE table_name = 'product_type';`);

    // Optionally drop the metadata table if it's no longer needed
    await queryRunner.query(`DROP TABLE table_metadata;`);
  }

}
