import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { User } from 'src/user/entities/user.entity';
import { TenantConnectionService } from 'src/tenant/tenant-connection.service';
import { TenantRequest } from 'src/tenant/tenant-context.middleware';

export interface JwtPayload {
  sub: string;
  username: string;
  tenantId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly tenantConnections: TenantConnectionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'change-me-wost-jwt-secret'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
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
    };
  }
}
