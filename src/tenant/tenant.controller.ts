import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { UpdateTenantConfigDto } from './dto/update-tenant-config.dto';
import { TenantId } from 'src/common/decorators/auth.decorators';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { PermissionCode } from 'src/common/enums';

@ApiTags('tenant')
@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  @RequirePermissions(PermissionCode.SYSTEM_ADMIN)
  findOne(@TenantId() tenantId: string) {
    return this.tenantService.findOne(tenantId);
  }

  @Get('config')
  @RequirePermissions(PermissionCode.SYSTEM_ADMIN)
  getConfig(@TenantId() tenantId: string) {
    return this.tenantService.getConfig(tenantId);
  }

  @Patch('config')
  @RequirePermissions(PermissionCode.SYSTEM_ADMIN)
  updateConfig(
    @TenantId() tenantId: string,
    @Body() dto: UpdateTenantConfigDto,
  ) {
    return this.tenantService.updateConfig(tenantId, dto);
  }
}
