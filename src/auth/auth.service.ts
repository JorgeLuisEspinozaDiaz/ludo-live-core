import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { validate as isUuid } from 'uuid';
import { EntityStatus } from 'src/common/enums';
import { Tenant } from 'src/tenant/entities/tenant.entity';
import { TenantConfig } from 'src/tenant/entities/tenant-config.entity';
import { Permission } from 'src/permission/entities/permission.entity';
import { Role } from 'src/role/entities/role.entity';
import { User } from 'src/user/entities/user.entity';
import { Menu } from 'src/menu/entities/menu.entity';
import { BootstrapDto, LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategy/jwt.strategy';
import {
  buildNavMenusFromPermissions,
  ensurePermissionCatalog,
} from 'src/sedder/permission-catalog';
import { TenantConnectionService } from 'src/tenant/tenant-connection.service';
import { PermissionsSeederService } from 'src/sedder/permissions-seeder.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly tenantConnections: TenantConnectionService,
    private readonly permissionsSeeder: PermissionsSeederService,
    @InjectRepository(Tenant, 'control')
    private readonly controlTenants: Repository<Tenant>,
  ) {}

  private async buildMenus(
    ds: import('typeorm').DataSource,
    permissions: Permission[],
  ) {
    const dbMenus = await ds.getRepository(Menu).find({
      relations: ['sections'],
      order: { sortOrder: 'ASC', sections: { sortOrder: 'ASC' } },
    });
    return buildNavMenusFromPermissions(permissions, dbMenus);
  }

  private async loadUserAuth(
    ds: import('typeorm').DataSource,
    tenantId: string,
    usernameOrEmail: string,
  ) {
    return ds
      .getRepository(User)
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('role.permissions', 'permissions')
      .leftJoinAndSelect('permissions.section', 'section')
      .leftJoinAndSelect('section.menu', 'menu')
      .where('user.tenant_id = :tenantId', { tenantId })
      .andWhere(
        '(LOWER(user.username) = LOWER(:q) OR LOWER(user.email) = LOWER(:q))',
        { q: usernameOrEmail },
      )
      .getOne();
  }

  private async loadUserById(ds: import('typeorm').DataSource, userId: string) {
    return ds.getRepository(User).findOne({
      where: { id: userId },
      relations: [
        'role',
        'role.permissions',
        'role.permissions.section',
        'role.permissions.section.menu',
      ],
    });
  }

  async login(loginDto: LoginDto) {
    let tenant: Tenant | null = null;

    if (loginDto.tenant) {
      if (isUuid(loginDto.tenant)) {
        tenant = await this.controlTenants.findOne({
          where: { id: loginDto.tenant },
        });
      } else {
        tenant = await this.controlTenants.findOne({
          where: { slug: loginDto.tenant },
        });
      }
      if (!tenant) {
        throw new UnauthorizedException('Tenant no encontrado');
      }
    } else {
      const tenants = await this.controlTenants.find({ take: 2 });
      if (tenants.length === 1) {
        tenant = tenants[0];
      } else if (tenants.length === 0) {
        throw new UnauthorizedException(
          'No hay tenants registrados. Ejecute bootstrap primero',
        );
      } else {
        throw new BadRequestException(
          'Debe indicar el tenant (slug o UUID) cuando hay varios',
        );
      }
    }

    if (tenant.status !== EntityStatus.ACTIVE) {
      throw new UnauthorizedException('El tenant está inactivo');
    }

    const ds = await this.tenantConnections.getByTenantId(tenant.id);
    const user = await this.loadUserAuth(ds, tenant.id, loginDto.username);
    if (!user || user.status !== EntityStatus.ACTIVE) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(loginDto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      tenantId: user.tenantId,
    };

    const permissions = (user.role?.permissions ?? []).map((p) => p.code);
    const menus = await this.buildMenus(ds, user.role?.permissions ?? []);

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        tenantId: user.tenantId,
        tenantSlug: tenant.slug,
        role: { id: user.roleId, name: user.role?.name },
      },
      permissions,
      menus,
    };
  }

  async me(userId: string, tenantId: string) {
    const ds = await this.tenantConnections.getByTenantId(tenantId);
    const user = await this.loadUserById(ds, userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    const permissions = (user.role?.permissions ?? []).map((p) => p.code);
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      tenantId: user.tenantId,
      role: { id: user.roleId, name: user.role?.name },
      permissions,
      menus: await this.buildMenus(ds, user.role?.permissions ?? []),
    };
  }

  async refresh(userId: string, tenantId: string) {
    const ds = await this.tenantConnections.getByTenantId(tenantId);
    const user = await this.loadUserById(ds, userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      tenantId: user.tenantId,
    };
    return { access_token: this.jwtService.sign(payload) };
  }

  async bootstrap(dto: BootstrapDto) {
    const existingSlug = await this.controlTenants.findOne({
      where: { slug: dto.tenantSlug },
    });
    if (existingSlug) {
      throw new BadRequestException(
        'El tenant ya existe. Bootstrap solo crea tenants nuevos',
      );
    }

    const controlTenant = await this.controlTenants.save(
      this.controlTenants.create({
        name: dto.tenantName,
        slug: dto.tenantSlug,
        status: EntityStatus.ACTIVE,
      }),
    );

    const ds = await this.tenantConnections.provisionTenantDatabase(
      controlTenant,
    );

    try {
      return await ds.transaction(async (manager) => {
        await ensurePermissionCatalog(manager);
        await this.permissionsSeeder.seedIntoManager(manager);

        await manager
          .createQueryBuilder()
          .insert()
          .into(Tenant)
          .values({
            id: controlTenant.id,
            name: controlTenant.name,
            slug: controlTenant.slug,
            status: EntityStatus.ACTIVE,
            databaseName: controlTenant.databaseName,
          })
          .orIgnore()
          .execute();

        const config = manager.create(TenantConfig, {
          tenantId: controlTenant.id,
          tradeName: dto.tenantName,
          ticketSeries: 'T001',
          boletaSeries: 'B001',
          facturaSeries: 'F001',
        });
        await manager.save(config);

        const allPermissions = await manager.find(Permission);
        const adminRole = manager.create(Role, {
          tenantId: controlTenant.id,
          name: 'Administrador',
          description: 'Acceso total al sistema',
          permissions: allPermissions,
        });
        await manager.save(adminRole);

        const hashed = await bcrypt.hash(dto.password, 10);
        const adminUser = manager.create(User, {
          tenantId: controlTenant.id,
          username: dto.username,
          email: dto.email,
          password: hashed,
          roleId: adminRole.id,
          status: EntityStatus.ACTIVE,
        });
        await manager.save(adminUser);

        return {
          tenant: {
            id: controlTenant.id,
            name: controlTenant.name,
            slug: controlTenant.slug,
            database: controlTenant.databaseName,
          },
          user: { id: adminUser.id, username: adminUser.username },
          message: 'Tenant inicializado con base de datos dedicada',
        };
      });
    } catch (err) {
      await this.controlTenants.delete(controlTenant.id);
      throw err;
    }
  }
}
