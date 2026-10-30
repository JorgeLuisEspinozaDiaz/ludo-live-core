import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { TENANT_ENTITIES } from './tenant-entities';
import { EntityStatus } from 'src/common/enums';

@Injectable()
export class TenantConnectionService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantConnectionService.name);
  private readonly cache = new Map<string, DataSource>();

  constructor(
    private readonly config: ConfigService,
    @InjectDataSource('control')
    private readonly controlDs: DataSource,
  ) {}

  private adminConfig() {
    return {
      host: this.config.get<string>('DB_HOST', 'localhost'),
      port: +(this.config.get<string>('DB_PORT') ?? 5432),
      username: this.config.get<string>('DB_USER', 'postgres'),
      password: this.config.get<string>('DB_PASSWORD', 'postgres'),
    };
  }

  sanitizeDbName(slug: string): string {
    const clean = slug
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 40);
    return `rem_ludo_${clean}`;
  }

  /**
   * Crea la BD física del tenant (si no existe) y deja un DataSource sincronizado.
   */
  async provisionTenantDatabase(tenant: Tenant): Promise<DataSource> {
    const databaseName =
      tenant.databaseName || this.sanitizeDbName(tenant.slug);
    const admin = this.adminConfig();

    const maintenance = new DataSource({
      type: 'postgres',
      host: tenant.dbHost || admin.host,
      port: tenant.dbPort || admin.port,
      username: tenant.dbUser || admin.username,
      password: tenant.dbPassword || admin.password,
      database: 'postgres',
    });

    await maintenance.initialize();
    try {
      const exists = await maintenance.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [databaseName],
      );
      if (!exists.length) {
        // identificador seguro (ya sanitizado)
        await maintenance.query(`CREATE DATABASE "${databaseName}"`);
        this.logger.log(`BD creada: ${databaseName}`);
      } else {
        this.logger.log(`BD ya existía: ${databaseName}`);
      }
    } finally {
      await maintenance.destroy();
    }

    // Persistir metadata en control
    await this.controlDs.getRepository(Tenant).update(tenant.id, {
      databaseName,
      dbHost: tenant.dbHost || admin.host,
      dbPort: tenant.dbPort || admin.port,
      dbUser: tenant.dbUser || admin.username,
    });

    tenant.databaseName = databaseName;
    tenant.dbHost = tenant.dbHost || admin.host;
    tenant.dbPort = tenant.dbPort || admin.port;
    tenant.dbUser = tenant.dbUser || admin.username;

    const ds = await this.createAndInitDataSource(tenant);
    this.cache.set(tenant.id, ds);
    return ds;
  }

  async getByTenantId(tenantId: string): Promise<DataSource> {
    const cached = this.cache.get(tenantId);
    if (cached?.isInitialized) return cached;

    const tenant = await this.controlDs.getRepository(Tenant).findOne({
      where: { id: tenantId, status: EntityStatus.ACTIVE },
    });
    if (!tenant?.databaseName) {
      throw new NotFoundException(
        'Tenant no encontrado o sin base de datos aprovisionada',
      );
    }

    const ds = await this.createAndInitDataSource(tenant);
    this.cache.set(tenantId, ds);
    return ds;
  }

  async getBySlug(slug: string): Promise<{ tenant: Tenant; ds: DataSource }> {
    const tenant = await this.controlDs.getRepository(Tenant).findOne({
      where: { slug, status: EntityStatus.ACTIVE },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }
    if (!tenant.databaseName) {
      const ds = await this.provisionTenantDatabase(tenant);
      return { tenant, ds };
    }
    const ds = await this.getByTenantId(tenant.id);
    return { tenant, ds };
  }

  async findControlTenantBySlug(slug: string): Promise<Tenant | null> {
    return this.controlDs.getRepository(Tenant).findOne({ where: { slug } });
  }

  async saveControlTenant(tenant: Tenant): Promise<Tenant> {
    return this.controlDs.getRepository(Tenant).save(tenant);
  }

  getControlDataSource(): DataSource {
    return this.controlDs;
  }

  private async createAndInitDataSource(tenant: Tenant): Promise<DataSource> {
    const admin = this.adminConfig();
    const ds = new DataSource({
      type: 'postgres',
      host: tenant.dbHost || admin.host,
      port: tenant.dbPort || admin.port,
      username: tenant.dbUser || admin.username,
      password: tenant.dbPassword || admin.password,
      database: tenant.databaseName!,
      entities: TENANT_ENTITIES,
      synchronize:
        this.config.get<string>('DB_SYNC', 'true') === 'true',
      logging: this.config.get<string>('DB_LOGGING', 'false') === 'true',
    });
    await ds.initialize();
    return ds;
  }

  async onModuleDestroy() {
    for (const [id, ds] of this.cache) {
      if (ds.isInitialized) {
        await ds.destroy();
        this.logger.log(`DataSource cerrado: tenant ${id}`);
      }
    }
    this.cache.clear();
  }
}
