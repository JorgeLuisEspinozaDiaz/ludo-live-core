import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserAccessPin1730340000000 implements MigrationInterface {
  name = 'AddUserAccessPin1730340000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS access_pin varchar(32) NULL;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_users_tenant_access_pin
      ON users (tenant_id, access_pin)
      WHERE access_pin IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS uq_users_tenant_access_pin`,
    );
    await queryRunner.query(
      `ALTER TABLE users DROP COLUMN IF EXISTS access_pin`,
    );
  }
}
