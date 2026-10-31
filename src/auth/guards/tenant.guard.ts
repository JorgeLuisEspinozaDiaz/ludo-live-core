import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from 'src/common/decorators/permissions.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    // Admin de plataforma opera sobre control plane (sin tenant)
    if (request.user?.isPlatformAdmin) return true;

    const headerTenant = request.headers['x-tenant-id'] as string | undefined;
    const userTenant = request.user?.tenantId as string | undefined;

    const tenantId = headerTenant || userTenant;
    if (!tenantId) {
      throw new BadRequestException('Header x-tenant-id es requerido');
    }

    if (userTenant && headerTenant && headerTenant !== userTenant) {
      throw new BadRequestException('x-tenant-id no coincide con el usuario');
    }

    request.tenantId = tenantId;
    return true;
  }
}
