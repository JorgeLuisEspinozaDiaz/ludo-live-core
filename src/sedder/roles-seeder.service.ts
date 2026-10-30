import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from 'src/tenant/entities/tenant.entity';
import { TenantConnectionService } from 'src/tenant/tenant-connection.service';
import { ensurePermissionCatalog } from './permission-catalog';
import { PermissionsSeederService } from './permissions-seeder.service';

/**
 * Al arrancar: sincroniza catálogo de permisos/menús en cada BD tenant existente.
 */
@Injectable()
export class RolesSeederService {
  private readonly logger = new Logger(RolesSeederService.name);

  constructor(
    @InjectRepository(Tenant, 'control')
    private readonly controlTenants: Repository<Tenant>,
    private readonly tenantConnections: TenantConnectionService,
    private readonly permissionsSeeder: PermissionsSeederService,
  ) {}

  async seed() {
    const tenants = await this.controlTenants.find();
    if (!tenants.length) {
      this.logger.log(
        'Sin tenants en control plane. Use POST /auth/bootstrap para crear el primero.',
      );
      return;
    }

    for (const tenant of tenants) {
      if (!tenant.databaseName) {
        this.logger.warn(
          `Tenant ${tenant.slug} sin databaseName; se omitió el seed`,
        );
        continue;
      }
      try {
        const ds = await this.tenantConnections.getByTenantId(tenant.id);
        await ds.transaction(async (manager) => {
          await ensurePermissionCatalog(manager);
          await this.permissionsSeeder.seedIntoManager(manager);
        });
        this.logger.log(`Catálogo sincronizado: ${tenant.slug}`);
      } catch (err) {
        this.logger.error(
          `Error sembrando tenant ${tenant.slug}: ${(err as Error).message}`,
        );
      }
    }
  }
}
