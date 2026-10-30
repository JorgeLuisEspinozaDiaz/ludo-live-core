import {
  BadRequestException,
  DynamicModule,
  Module,
  Scope,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntitySchema, ObjectLiteral } from 'typeorm';
import { validate as isUuid } from 'uuid';
import { TenantConnectionService } from './tenant-connection.service';

export const TENANT_DATA_SOURCE = 'TENANT_DATA_SOURCE';

type EntityClass = Function | EntitySchema<ObjectLiteral>;

/**
 * Repositorios y DataSource scoped al request, apuntando a la BD del tenant.
 * Usa los mismos tokens que TypeOrmModule.forFeature para no tocar los services.
 */
@Module({})
export class TenantOrmModule {
  static forFeature(entities: EntityClass[]): DynamicModule {
    const dataSourceProvider = {
      provide: TENANT_DATA_SOURCE,
      scope: Scope.REQUEST,
      inject: [REQUEST, TenantConnectionService],
      useFactory: async (
        req: {
          tenantDataSource?: DataSource;
          tenantId?: string;
          user?: { tenantId?: string };
          headers?: Record<string, string | undefined>;
        },
        tcs: TenantConnectionService,
      ): Promise<DataSource> => {
        if (req.tenantDataSource?.isInitialized) {
          return req.tenantDataSource;
        }

        const raw =
          req.tenantId ||
          req.user?.tenantId ||
          req.headers?.['x-tenant-id'];

        if (!raw) {
          throw new BadRequestException(
            'Contexto de tenant no disponible (x-tenant-id o JWT)',
          );
        }

        let ds: DataSource;
        let resolvedId: string;

        if (isUuid(raw)) {
          ds = await tcs.getByTenantId(raw);
          resolvedId = raw;
        } else {
          const result = await tcs.getBySlug(raw);
          ds = result.ds;
          resolvedId = result.tenant.id;
        }

        req.tenantDataSource = ds;
        req.tenantId = resolvedId;
        return ds;
      },
    };

    /** Permite `constructor(private ds: DataSource)` en services del tenant. */
    const defaultDataSourceProvider = {
      provide: DataSource,
      scope: Scope.REQUEST,
      inject: [TENANT_DATA_SOURCE],
      useFactory: (ds: DataSource) => ds,
    };

    const repositoryProviders = entities.map((entity) => ({
      provide: getRepositoryToken(entity as Function),
      scope: Scope.REQUEST,
      inject: [TENANT_DATA_SOURCE],
      useFactory: (ds: DataSource) => ds.getRepository(entity as Function),
    }));

    return {
      module: TenantOrmModule,
      providers: [
        dataSourceProvider,
        defaultDataSourceProvider,
        ...repositoryProviders,
      ],
      exports: [
        dataSourceProvider,
        defaultDataSourceProvider,
        ...repositoryProviders,
      ],
    };
  }
}
