import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Schema base del tenant: identity (tenants espejo, users, roles, permissions, menus).
 * Debe correr antes de InitLudoLive.
 */
export class InitCoreSchema1730320000000 implements MigrationInterface {
  name = 'InitCoreSchema1730320000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE entity_status_enum AS ENUM ('ACTIVE', 'INACTIVE');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar NOT NULL,
        slug varchar NOT NULL UNIQUE,
        status entity_status_enum NOT NULL DEFAULT 'ACTIVE',
        database_name varchar NULL,
        db_host varchar NULL,
        db_port int NULL,
        db_user varchar NULL,
        db_password varchar NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        created_by uuid NULL,
        updated_by uuid NULL
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tenant_configs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        currency varchar NOT NULL DEFAULT 'PEN',
        igv_rate numeric(5,2) NOT NULL DEFAULT 18,
        trade_name varchar NULL,
        logo_url varchar NULL,
        ticket_series varchar NOT NULL DEFAULT 'T001',
        boleta_series varchar NOT NULL DEFAULT 'B001',
        factura_series varchar NOT NULL DEFAULT 'F001',
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        created_by uuid NULL,
        updated_by uuid NULL
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS menus (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar NOT NULL,
        sort_order int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        created_by uuid NULL,
        updated_by uuid NULL
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sections (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar NOT NULL,
        menu_id uuid NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
        sort_order int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        created_by uuid NULL,
        updated_by uuid NULL,
        CONSTRAINT uq_sections_name_menu UNIQUE (name, menu_id)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code varchar NOT NULL UNIQUE,
        endpoint varchar NULL,
        description varchar NOT NULL,
        section_id uuid NULL REFERENCES sections(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        created_by uuid NULL,
        updated_by uuid NULL
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name varchar NOT NULL,
        description varchar NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        created_by uuid NULL,
        updated_by uuid NULL,
        CONSTRAINT uq_roles_tenant_name UNIQUE (tenant_id, name)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        PRIMARY KEY (role_id, permission_id)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        username varchar NOT NULL,
        email varchar NULL,
        access_pin varchar(32) NULL,
        password varchar NOT NULL,
        role_id uuid NOT NULL REFERENCES roles(id),
        status entity_status_enum NOT NULL DEFAULT 'ACTIVE',
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        created_by uuid NULL,
        updated_by uuid NULL,
        CONSTRAINT uq_users_tenant_username UNIQUE (tenant_id, username),
        CONSTRAINT uq_users_tenant_email UNIQUE (tenant_id, email)
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_users_tenant_access_pin
      ON users (tenant_id, access_pin)
      WHERE access_pin IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
    await queryRunner.query(`DROP TABLE IF EXISTS role_permissions`);
    await queryRunner.query(`DROP TABLE IF EXISTS roles`);
    await queryRunner.query(`DROP TABLE IF EXISTS permissions`);
    await queryRunner.query(`DROP TABLE IF EXISTS sections`);
    await queryRunner.query(`DROP TABLE IF EXISTS menus`);
    await queryRunner.query(`DROP TABLE IF EXISTS tenant_configs`);
    await queryRunner.query(`DROP TABLE IF EXISTS tenants`);
  }
}
