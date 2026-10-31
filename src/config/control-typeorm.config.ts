import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Tenant } from 'src/tenant/entities/tenant.entity';
import { PlatformAdmin } from 'src/platform/entities/platform-admin.entity';

/** BD de control: catálogo de tenants + admins de plataforma. */
export const controlTypeOrmConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  name: 'control',
  type: 'postgres',
  host: configService.get<string>('CONTROL_DB_HOST') ||
    configService.get<string>('DB_HOST', 'localhost'),
  port: +(
    configService.get<string>('CONTROL_DB_PORT') ||
    configService.get<string>('DB_PORT') ||
    5432
  ),
  username:
    configService.get<string>('CONTROL_DB_USER') ||
    configService.get<string>('DB_USER', 'postgres'),
  password:
    configService.get<string>('CONTROL_DB_PASSWORD') ||
    configService.get<string>('DB_PASSWORD', 'postgres'),
  database:
    configService.get<string>('CONTROL_DB_NAME') ||
    configService.get<string>('DB_NAME', 'wost_control'),
  entities: [Tenant, PlatformAdmin],
  // El control plane solo tiene `tenants`; se sincroniza aunque DB_SYNC=false
  // (DB_SYNC aplica a las BD de cada tenant, que usan migraciones).
  synchronize:
    (configService.get<string>('CONTROL_DB_SYNC') ?? 'true') === 'true',
  logging: configService.get<string>('DB_LOGGING', 'false') === 'true',
});
