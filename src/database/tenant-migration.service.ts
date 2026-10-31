import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InitCoreSchema1730320000000 } from './migrations/tenant/1730320000000-InitCoreSchema';
import { InitLudoLive1730330000000 } from './migrations/tenant/1730330000000-InitLudoLive';
import { AddUserAccessPin1730340000000 } from './migrations/tenant/1730340000000-AddUserAccessPin';

const TENANT_MIGRATIONS = [
  InitCoreSchema1730320000000,
  InitLudoLive1730330000000,
  AddUserAccessPin1730340000000,
];

@Injectable()
export class TenantMigrationService {
  private readonly logger = new Logger(TenantMigrationService.name);

  async runForDataSource(ds: DataSource): Promise<void> {
    // Asegura extensión uuid si hace falta
    await ds.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    const runner = ds.createQueryRunner();
    await runner.connect();
    try {
      await runner.query(`
        CREATE TABLE IF NOT EXISTS tenant_migrations (
          id serial PRIMARY KEY,
          name varchar(255) NOT NULL UNIQUE,
          executed_at timestamptz NOT NULL DEFAULT NOW()
        );
      `);

      for (const Migration of TENANT_MIGRATIONS) {
        const instance = new Migration();
        const name = instance.name;
        const exists = await runner.query(
          `SELECT 1 FROM tenant_migrations WHERE name = $1`,
          [name],
        );
        if (exists.length) continue;

        this.logger.log(`Aplicando migración tenant: ${name}`);
        await runner.startTransaction();
        try {
          await instance.up(runner);
          await runner.query(
            `INSERT INTO tenant_migrations (name) VALUES ($1)`,
            [name],
          );
          await runner.commitTransaction();
        } catch (err) {
          await runner.rollbackTransaction();
          throw err;
        }
      }
    } finally {
      await runner.release();
    }
  }
}
