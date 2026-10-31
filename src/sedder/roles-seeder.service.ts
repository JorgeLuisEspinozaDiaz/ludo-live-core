import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from 'src/tenant/entities/tenant.entity';
import { TenantConnectionService } from 'src/tenant/tenant-connection.service';
import { ensurePermissionCatalog } from './permission-catalog';
import { PermissionsSeederService } from './permissions-seeder.service';
import { ensureGameRolesAndConfig } from './roles-bootstrap';

/**
 * Al arrancar: sincroniza catálogo de permisos/menús/roles en cada BD tenant.
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
    let tenants: Tenant[];
    try {
      tenants = await this.controlTenants.find();
    } catch (err) {
      this.logger.warn(
        `No se pudo leer control.tenants (${(err as Error).message}). ` +
          'Asegure CONTROL_DB_SYNC=true o cree la tabla y reinicie.',
      );
      return;
    }

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
          await ensureGameRolesAndConfig(manager, tenant.id);
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
