import { Tenant } from 'src/tenant/entities/tenant.entity';
import { TenantConfig } from 'src/tenant/entities/tenant-config.entity';
import { User } from 'src/user/entities/user.entity';
import { Role } from 'src/role/entities/role.entity';
import { Permission } from 'src/permission/entities/permission.entity';
import { Menu } from 'src/menu/entities/menu.entity';
import { Section } from 'src/section/entities/section.entity';

/** Entidades que viven en la BD de cada tenant (no en control plane). */
export const TENANT_ENTITIES = [
  Tenant, // fila espejo para FKs (User/Role)
  TenantConfig,
  User,
  Role,
  Permission,
  Menu,
  Section,
];
