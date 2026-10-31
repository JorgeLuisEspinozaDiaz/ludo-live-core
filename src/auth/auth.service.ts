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
import { ensureGameRolesAndConfig } from 'src/sedder/roles-bootstrap';
import { Wallet } from 'src/wallet/entities/wallet.entity';
import { PointsWallet } from 'src/points/entities/points-wallet.entity';
import { ROLE_ADMIN } from 'src/common/enums';

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

  private async resolveTenant(tenantHint?: string) {
    let tenant: Tenant | null = null;
    if (tenantHint) {
      if (isUuid(tenantHint)) {
        tenant = await this.controlTenants.findOne({
          where: { id: tenantHint },
        });
      } else {
        tenant = await this.controlTenants.findOne({
          where: { slug: tenantHint },
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
    return tenant;
  }

  async login(loginDto: LoginDto) {
    const tenant = await this.resolveTenant(loginDto.tenant);
    const ds = await this.tenantConnections.getByTenantId(tenant.id);
    const user = await this.loadUserAuth(ds, tenant.id, loginDto.username);
    if (!user || user.status !== EntityStatus.ACTIVE) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(loginDto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.issueSession(user.id, tenant.id);
  }

  /** Entrada de jugador solo con PIN */
  async loginByPin(pin: string, tenantHint?: string) {
    const tenant = await this.resolveTenant(tenantHint);
    const ds = await this.tenantConnections.getByTenantId(tenant.id);
    const normalized = pin.trim();
    const user = await ds.getRepository(User).findOne({
      where: { tenantId: tenant.id, accessPin: normalized },
      relations: [
        'role',
        'role.permissions',
        'role.permissions.section',
        'role.permissions.section.menu',
      ],
    });
    if (!user || user.status !== EntityStatus.ACTIVE) {
      throw new UnauthorizedException('PIN inválido');
    }
    return this.issueSession(user.id, tenant.id);
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

  /** Sesión completa (login response) para un usuario ya validado */
  async issueSession(userId: string, tenantId: string) {
    const tenant = await this.controlTenants.findOne({ where: { id: tenantId } });
    if (!tenant || tenant.status !== EntityStatus.ACTIVE) {
      throw new UnauthorizedException('Tenant inválido');
    }
    const ds = await this.tenantConnections.getByTenantId(tenantId);
    const user = await this.loadUserById(ds, userId);
    if (!user || user.status !== EntityStatus.ACTIVE) {
      throw new UnauthorizedException('Usuario no encontrado');
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

  /** Token de invitación (link directo sin PIN) */
  async createInviteToken(
    tenantId: string,
    userId: string,
    opts?: { liveId?: string; expiresInDays?: number },
  ) {
    const ds = await this.tenantConnections.getByTenantId(tenantId);
    const user = await this.loadUserById(ds, userId);
    if (!user || user.status !== EntityStatus.ACTIVE) {
      throw new BadRequestException('Usuario no encontrado o inactivo');
    }
    const days = Math.min(Math.max(opts?.expiresInDays ?? 7, 1), 30);
    const token = this.jwtService.sign(
      {
        typ: 'invite',
        sub: user.id,
        tenantId,
        username: user.username,
        liveId: opts?.liveId ?? null,
      },
      { expiresIn: `${days}d` },
    );
    return {
      token,
      username: user.username,
      liveId: opts?.liveId ?? null,
      expiresInDays: days,
    };
  }

  async redeemInvite(token: string) {
    let payload: {
      typ?: string;
      sub: string;
      tenantId: string;
      liveId?: string | null;
    };
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Link inválido o vencido');
    }
    if (payload.typ !== 'invite' || !payload.sub || !payload.tenantId) {
      throw new UnauthorizedException('Link inválido');
    }
    const session = await this.issueSession(payload.sub, payload.tenantId);
    return {
      ...session,
      liveId: payload.liveId ?? null,
    };
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

        const { admin } = await ensureGameRolesAndConfig(
          manager,
          controlTenant.id,
        );

        // Asegurar que el rol admin tenga todos los permisos (incl. endpoints)
        const allPermissions = await manager.find(Permission);
        admin.permissions = allPermissions;
        admin.name = ROLE_ADMIN;
        await manager.save(admin);

        const hashed = await bcrypt.hash(dto.password, 10);
        const adminUser = manager.create(User, {
          tenantId: controlTenant.id,
          username: dto.username,
          email: dto.email,
          password: hashed,
          roleId: admin.id,
          status: EntityStatus.ACTIVE,
        });
        await manager.save(adminUser);

        await manager.save(
          manager.create(Wallet, {
            tenantId: controlTenant.id,
            userId: adminUser.id,
            balanceCents: 0,
          }),
        );
        await manager.save(
          manager.create(PointsWallet, {
            tenantId: controlTenant.id,
            userId: adminUser.id,
            balance: 0,
          }),
        );

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
