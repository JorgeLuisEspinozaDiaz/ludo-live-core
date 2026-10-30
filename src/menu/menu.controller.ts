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
import { MenuService } from './menu.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { PermissionCode } from 'src/common/enums';

@ApiTags('menus')
@Controller('menus')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Post()
  @RequirePermissions(PermissionCode.SYSTEM_ADMIN)
  create(@Body() dto: CreateMenuDto) {
    return this.menuService.create(dto);
  }

  @Get()
  @RequirePermissions(PermissionCode.SYSTEM_ADMIN)
  findAll(@Query() query: PaginationQueryDto) {
    return this.menuService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(PermissionCode.SYSTEM_ADMIN)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.menuService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.SYSTEM_ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMenuDto,
  ) {
    return this.menuService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PermissionCode.SYSTEM_ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.menuService.remove(id);
  }
}
