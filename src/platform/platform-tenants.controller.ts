import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  Public,
  RequirePermissions,
} from 'src/common/decorators/permissions.decorator';
import {
  ChangeTenantStatusDto,
  CreateTenantDto,
  PlatformLoginDto,
  ResetTenantAdminPasswordDto,
  UpdateTenantDto,
} from './dto/platform.dto';
import {
  PLATFORM_PERMISSION,
  PlatformAdminService,
} from './platform-admin.service';
import { PlatformTenantsService } from './platform-tenants.service';

@ApiTags('Platform')
@ApiBearerAuth()
@Controller('platform/tenants')
@RequirePermissions(PLATFORM_PERMISSION)
export class PlatformTenantsController {
  constructor(private readonly tenants: PlatformTenantsService) {}

  @Get()
  list(@Query('search') search?: string) {
    return this.tenants.list(search);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.tenants.get(id);
  }

  @Post()
  create(@Body() dto: CreateTenantDto) {
    return this.tenants.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenants.update(id, dto);
  }

  @Patch(':id/status')
  changeStatus(@Param('id') id: string, @Body() dto: ChangeTenantStatusDto) {
    return this.tenants.changeStatus(id, dto);
  }

  @Get(':id/admins')
  listAdmins(@Param('id') id: string) {
    return this.tenants.listAdmins(id);
  }

  @Patch(':id/admins/:userId/password')
  resetAdminPassword(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: ResetTenantAdminPasswordDto,
  ) {
    return this.tenants.resetAdminPassword(id, userId, dto.password);
  }
}

@ApiTags('Platform')
@Controller('auth/platform')
export class PlatformAuthController {
  constructor(private readonly platformAdmins: PlatformAdminService) {}

  @Public()
  @Post('login')
  login(@Body() dto: PlatformLoginDto) {
    return this.platformAdmins.login(dto);
  }
}
