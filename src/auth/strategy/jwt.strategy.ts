import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { TenantConnectionService } from 'src/tenant/tenant-connection.service';
import { TenantRequest } from 'src/tenant/tenant-context.middleware';
import { PlatformAdmin } from 'src/platform/entities/platform-admin.entity';
import { PLATFORM_PERMISSION } from 'src/platform/platform-admin.service';
import { EntityStatus } from 'src/common/enums';

export interface JwtPayload {
  sub: string;
  username: string;
  tenantId?: string;
  typ?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly tenantConnections: TenantConnectionService,
    @InjectRepository(PlatformAdmin, 'control')
    private readonly platformAdmins: Repository<PlatformAdmin>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'change-me-wost-jwt-secret'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    if (payload.typ === 'platform') {
      const admin = await this.platformAdmins.findOne({
        where: { id: payload.sub },
      });
      if (!admin || admin.status !== EntityStatus.ACTIVE) {
        throw new UnauthorizedException('Admin de plataforma no válido');
      }
      return {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        tenantId: undefined,
        isPlatformAdmin: true,
        roleId: 'platform',
        roleName: 'Administrador total',
        permissionCodes: [PLATFORM_PERMISSION],
      };
    }

    if (!payload.tenantId) {
      throw new UnauthorizedException('Token sin tenant');
    }

    const ds = await this.tenantConnections.getByTenantId(payload.tenantId);
    const tenantReq = req as TenantRequest;
    tenantReq.tenantDataSource = ds;
    tenantReq.tenantId = payload.tenantId;

    const user = await ds.getRepository(User).findOne({
      where: { id: payload.sub },
      relations: ['role', 'role.permissions'],
    });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      tenantId: user.tenantId,
      roleId: user.roleId,
      roleName: user.role?.name,
      permissionCodes: (user.role?.permissions ?? []).map((p) => p.code),
      isPlatformAdmin: false,
    };
  }
}
