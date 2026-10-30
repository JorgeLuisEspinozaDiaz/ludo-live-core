import {
  Global,
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { TenantConfig } from './entities/tenant-config.entity';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantConnectionService } from './tenant-connection.service';
import { TenantContextMiddleware } from './tenant-context.middleware';
import { TenantOrmModule } from './tenant-orm.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant], 'control'),
    TenantOrmModule.forFeature([Tenant, TenantConfig]),
  ],
  controllers: [TenantController],
  providers: [
    TenantService,
    TenantConnectionService,
    TenantContextMiddleware,
  ],
  exports: [
    TenantService,
    TenantConnectionService,
    TypeOrmModule,
    TenantOrmModule,
  ],
})
export class TenantModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantContextMiddleware)
      .exclude(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/bootstrap', method: RequestMethod.POST },
        { path: 'api', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}
