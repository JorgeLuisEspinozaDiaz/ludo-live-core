import { Module } from '@nestjs/common';
import { TenantOrmModule } from 'src/tenant/tenant-orm.module';
import { Role } from './entities/role.entity';
import { Permission } from 'src/permission/entities/permission.entity';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';

@Module({
  imports: [TenantOrmModule.forFeature([Role, Permission])],
  controllers: [RoleController],
  providers: [RoleService],
  exports: [RoleService],
})
export class RoleModule {}
