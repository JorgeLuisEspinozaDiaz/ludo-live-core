import { Module } from '@nestjs/common';
import { TenantOrmModule } from 'src/tenant/tenant-orm.module';
import { Permission } from './entities/permission.entity';
import { PermissionService } from './permission.service';
import { PermissionController } from './permission.controller';

@Module({
  imports: [TenantOrmModule.forFeature([Permission])],
  controllers: [PermissionController],
  providers: [PermissionService],
  exports: [PermissionService],
})
export class PermissionModule {}
