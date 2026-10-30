import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { validate as isUuid } from 'uuid';
import { TenantConnectionService } from './tenant-connection.service';

export type TenantRequest = Request & {
  tenantId?: string;
  tenantDataSource?: import('typeorm').DataSource;
};

/**
 * Precarga el DataSource del tenant si viene x-tenant-id
 * (slug o UUID) antes de guards/controllers.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly connections: TenantConnectionService) {}

  async use(req: TenantRequest, _res: Response, next: NextFunction) {
    const header = req.headers['x-tenant-id'];
    const raw = Array.isArray(header) ? header[0] : header;
    if (!raw) {
      next();
      return;
    }

    try {
      if (isUuid(raw)) {
        req.tenantDataSource = await this.connections.getByTenantId(raw);
        req.tenantId = raw;
      } else {
        const { tenant, ds } = await this.connections.getBySlug(raw);
        req.tenantDataSource = ds;
        req.tenantId = tenant.id;
      }
    } catch {
      // TenantGuard / Auth devolverán el error apropiado
    }
    next();
  }
}
