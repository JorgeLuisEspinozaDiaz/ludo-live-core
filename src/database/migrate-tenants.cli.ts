import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.module';
import { TenantConnectionService } from 'src/tenant/tenant-connection.service';
import { TenantMigrationService } from './tenant-migration.service';
import { Tenant } from 'src/tenant/entities/tenant.entity';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });
  try {
    const connections = app.get(TenantConnectionService);
    const migrations = app.get(TenantMigrationService);
    const control = connections.getControlDataSource();
    const tenants = await control.getRepository(Tenant).find();

    if (!tenants.length) {
      console.log('Sin tenants. Nada que migrar.');
      return;
    }

    for (const tenant of tenants) {
      if (!tenant.databaseName) {
        console.warn(`Omitido ${tenant.slug}: sin databaseName`);
        continue;
      }
      try {
        const ds = await connections.getByTenantId(tenant.id);
        await migrations.runForDataSource(ds);
        console.log(`OK: ${tenant.slug}`);
      } catch (err) {
        console.error(`FAIL ${tenant.slug}: ${(err as Error).message}`);
      }
    }
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
