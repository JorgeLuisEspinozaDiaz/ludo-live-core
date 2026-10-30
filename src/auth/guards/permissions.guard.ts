import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  IS_PUBLIC_KEY,
  PERMISSIONS_KEY,
} from 'src/common/decorators/permissions.decorator';
import { PermissionCode } from 'src/common/enums';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const codes: string[] = user?.permissionCodes ?? [];

    if (codes.includes(PermissionCode.SYSTEM_ADMIN)) return true;

    const ok = required.every((p) => codes.includes(p));
    if (!ok) {
      throw new ForbiddenException('No tienes permisos para esta acción');
    }
    return true;
  }
}
