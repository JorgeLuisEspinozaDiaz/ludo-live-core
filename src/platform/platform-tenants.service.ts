import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { PermissionCode, ROLE_ADMIN } from 'src/common/enums';
import { Tenant } from 'src/tenant/entities/tenant.entity';
import { User } from 'src/user/entities/user.entity';
import { AuthService } from 'src/auth/auth.service';
import { TenantConnectionService } from 'src/tenant/tenant-connection.service';
import {
  ChangeTenantStatusDto,
  CreateTenantDto,
  UpdateTenantDto,
} from './dto/platform.dto';

@Injectable()
export class PlatformTenantsService {
  constructor(
    @InjectRepository(Tenant, 'control')
    private readonly controlTenants: Repository<Tenant>,
    private readonly authService: AuthService,
    private readonly tenantConnections: TenantConnectionService,
  ) {}

  toPublic(t: Tenant) {
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      status: t.status,
      databaseName: t.databaseName,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }

  async list(search?: string) {
    const qb = this.controlTenants
      .createQueryBuilder('t')
      .orderBy('t.created_at', 'DESC');
    if (search?.trim()) {
      qb.andWhere(
        '(LOWER(t.name) LIKE LOWER(:q) OR LOWER(t.slug) LIKE LOWER(:q))',
        { q: `%${search.trim()}%` },
      );
    }
    const rows = await qb.getMany();
    return rows.map((t) => this.toPublic(t));
  }

  async get(id: string) {
    const t = await this.controlTenants.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Tenant no encontrado');
    return this.toPublic(t);
  }

  async create(dto: CreateTenantDto) {
    const reserved = new Set([
      'www',
      'app',
      'api',
      'admin',
      'platform',
      'localhost',
    ]);
    if (reserved.has(dto.tenantSlug.toLowerCase())) {
      throw new BadRequestException('Slug reservado');
    }
    return this.authService.bootstrap({
      tenantName: dto.tenantName,
      tenantSlug: dto.tenantSlug,
      username: dto.username,
      password: dto.password,
      email: dto.email,
      adminName: dto.adminName,
    });
  }

  async update(id: string, dto: UpdateTenantDto) {
    const t = await this.controlTenants.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Tenant no encontrado');

    if (dto.slug && dto.slug !== t.slug) {
      const clash = await this.controlTenants.findOne({
        where: { slug: dto.slug },
      });
      if (clash) throw new BadRequestException('El slug ya está en uso');
      t.slug = dto.slug;
    }
    if (dto.name) t.name = dto.name;
    await this.controlTenants.save(t);

    try {
      const ds = await this.tenantConnections.getByTenantId(t.id);
      await ds.getRepository(Tenant).update(
        { id: t.id },
        { name: t.name, slug: t.slug },
      );
    } catch {
      /* espejo opcional si la BD tenant no está disponible */
    }

    return this.toPublic(t);
  }

  /** Usuarios administradores del tenant (rol Administrador o system.admin). */
  async listAdmins(id: string) {
    await this.get(id);
    const ds = await this.tenantConnections.getByTenantId(id);
    const users = await ds
      .getRepository(User)
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoin('role.permissions', 'permission')
      .where('user.tenant_id = :id', { id })
      .andWhere('(role.name = :roleName OR permission.code = :code)', {
        roleName: ROLE_ADMIN,
        code: PermissionCode.SYSTEM_ADMIN,
      })
      .orderBy('user.created_at', 'ASC')
      .getMany();

    return users.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email ?? null,
      status: u.status,
      roleName: u.role?.name ?? null,
      createdAt: u.createdAt,
    }));
  }

  async resetAdminPassword(id: string, userId: string, password: string) {
    const admins = await this.listAdmins(id);
    if (!admins.some((a) => a.id === userId)) {
      throw new NotFoundException('Administrador no encontrado en este tenant');
    }
    const ds = await this.tenantConnections.getByTenantId(id);
    const hashed = await bcrypt.hash(password, 10);
    await ds.getRepository(User).update({ id: userId }, { password: hashed });
    return { ok: true };
  }

  async changeStatus(id: string, dto: ChangeTenantStatusDto) {
    const t = await this.controlTenants.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Tenant no encontrado');
    t.status = dto.status;
    await this.controlTenants.save(t);

    try {
      const ds = await this.tenantConnections.getByTenantId(t.id);
      await ds.getRepository(Tenant).update({ id: t.id }, { status: t.status });
    } catch {
      /* espejo opcional */
    }

    return this.toPublic(t);
  }
}
