import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, TenantId } from 'src/common/decorators/auth.decorators';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { PermissionCode } from 'src/common/enums';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { LiveService } from './live.service';
import { CreateLiveDto, UpdateLiveDto } from './dto/live.dto';

@ApiTags('Lives')
@ApiBearerAuth()
@Controller('lives')
export class LiveController {
  constructor(private readonly service: LiveService) {}

  @Post()
  @RequirePermissions(PermissionCode.LIVE_MANAGE)
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateLiveDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.create(tenantId, dto, user.id);
  }

  @Get()
  @RequirePermissions(PermissionCode.LIVE_VIEW)
  findAll(@TenantId() tenantId: string, @Query() query: PaginationQueryDto) {
    return this.service.findAll(tenantId, query);
  }

  @Get(':id')
  @RequirePermissions(PermissionCode.LIVE_VIEW)
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.LIVE_MANAGE)
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLiveDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.update(tenantId, id, dto, user.id);
  }

  @Post(':id/start')
  @RequirePermissions(PermissionCode.LIVE_MANAGE)
  start(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.start(tenantId, id, user.id);
  }

  @Post(':id/end')
  @RequirePermissions(PermissionCode.LIVE_MANAGE)
  end(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.end(tenantId, id, user.id);
  }

  @Post(':id/token')
  @RequirePermissions(PermissionCode.LIVE_VIEW)
  token(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser()
    user: { id: string; username?: string; permissionCodes?: string[] },
  ) {
    return this.service.token(tenantId, id, user);
  }

  @Get(':id/participants')
  @RequirePermissions(PermissionCode.LIVE_VIEW)
  participants(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.listParticipants(tenantId, id);
  }

  @Get(':id/viewers')
  @RequirePermissions(PermissionCode.LIVE_VIEW)
  viewers(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.countViewers(tenantId, id);
  }
}
