import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { TenantId } from 'src/common/decorators/auth.decorators';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { PermissionCode } from 'src/common/enums';

@ApiTags('roles')
@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @RequirePermissions(PermissionCode.SYSTEM_ADMIN)
  create(@TenantId() tenantId: string, @Body() dto: CreateRoleDto) {
    return this.roleService.create(tenantId, dto);
  }

  @Get()
  @RequirePermissions(PermissionCode.SYSTEM_ADMIN)
  findAll(
    @TenantId() tenantId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.roleService.findAll(tenantId, query);
  }

  @Get(':id')
  @RequirePermissions(PermissionCode.SYSTEM_ADMIN)
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.roleService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.SYSTEM_ADMIN)
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.roleService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PermissionCode.SYSTEM_ADMIN)
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.roleService.remove(tenantId, id);
  }
}
