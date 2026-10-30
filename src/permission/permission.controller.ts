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
import { PermissionService } from './permission.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { PermissionCode } from 'src/common/enums';

@ApiTags('permissions')
@Controller('permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Post()
  @RequirePermissions(PermissionCode.SYSTEM_ADMIN)
  create(@Body() dto: CreatePermissionDto) {
    return this.permissionService.create(dto);
  }

  @Get()
  @RequirePermissions(PermissionCode.SYSTEM_ADMIN)
  findAll(@Query() query: PaginationQueryDto) {
    return this.permissionService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(PermissionCode.SYSTEM_ADMIN)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.permissionService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.SYSTEM_ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePermissionDto,
  ) {
    return this.permissionService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PermissionCode.SYSTEM_ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.permissionService.remove(id);
  }
}
