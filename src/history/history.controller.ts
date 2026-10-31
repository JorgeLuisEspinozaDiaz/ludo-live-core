import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser, TenantId } from 'src/common/decorators/auth.decorators';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { PermissionCode } from 'src/common/enums';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { HistoryService } from './history.service';

@ApiTags('History')
@ApiBearerAuth()
@Controller('history')
export class HistoryController {
  constructor(private readonly service: HistoryService) {}

  @Get('rounds')
  @RequirePermissions(PermissionCode.HISTORY_VIEW)
  list(
    @TenantId() tenantId: string,
    @Query() query: PaginationQueryDto & { liveId?: string; userId?: string },
    @CurrentUser() user: { id: string; permissionCodes?: string[] },
  ) {
    return this.service.list(tenantId, query, user);
  }

  @Get('rounds/export.csv')
  @RequirePermissions(PermissionCode.HISTORY_EXPORT)
  @Header('Content-Type', 'text/csv')
  async export(
    @TenantId() tenantId: string,
    @CurrentUser() user: { id: string; permissionCodes?: string[] },
    @Res() res: Response,
  ) {
    const csv = await this.service.exportCsv(tenantId, user);
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="round-history.csv"',
    );
    res.send(csv);
  }

  @Get('rounds/:id')
  @RequirePermissions(PermissionCode.HISTORY_VIEW)
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; permissionCodes?: string[] },
  ) {
    return this.service.findOne(tenantId, id, user);
  }
}
