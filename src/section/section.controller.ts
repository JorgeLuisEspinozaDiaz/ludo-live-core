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
import { SectionService } from './section.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { PermissionCode } from 'src/common/enums';

@ApiTags('sections')
@Controller('sections')
export class SectionController {
  constructor(private readonly sectionService: SectionService) {}

  @Post()
  @RequirePermissions(PermissionCode.SYSTEM_ADMIN)
  create(@Body() dto: CreateSectionDto) {
    return this.sectionService.create(dto);
  }

  @Get()
  @RequirePermissions(PermissionCode.SYSTEM_ADMIN)
  findAll(@Query() query: PaginationQueryDto) {
    return this.sectionService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(PermissionCode.SYSTEM_ADMIN)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.sectionService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.SYSTEM_ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.sectionService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PermissionCode.SYSTEM_ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.sectionService.remove(id);
  }
}
