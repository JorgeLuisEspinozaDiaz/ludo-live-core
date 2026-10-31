import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, TenantId } from 'src/common/decorators/auth.decorators';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { PermissionCode } from 'src/common/enums';
import { PointsService } from './points.service';
import { AdjustPointsDto, RedeemPointsDto } from './dto/points.dto';
import { RealtimeEmitterService } from 'src/realtime/realtime-emitter.service';
import { AuditService } from 'src/audit/audit.service';

@ApiTags('Points')
@ApiBearerAuth()
@Controller('points')
export class PointsController {
  constructor(
    private readonly service: PointsService,
    private readonly realtime: RealtimeEmitterService,
    private readonly audit: AuditService,
  ) {}

  @Get('me')
  @RequirePermissions(PermissionCode.WALLET_VIEW_OWN)
  me(@TenantId() tenantId: string, @CurrentUser() user: { id: string }) {
    return this.service.getMine(tenantId, user.id);
  }

  @Post('redeem')
  @RequirePermissions(PermissionCode.POINTS_REDEEM)
  async redeem(
    @TenantId() tenantId: string,
    @Body() dto: RedeemPointsDto,
    @CurrentUser() user: { id: string },
  ) {
    const result = await this.service.redeem(tenantId, user.id, dto.points);
    this.realtime.emitToUser(tenantId, user.id, 'wallet:updated', result.wallet);
    await this.audit.write({
      tenantId,
      actorId: user.id,
      action: 'points.redeem',
      entityType: 'points',
      afterData: result,
    });
    return result;
  }

  @Post(':userId/adjust')
  @RequirePermissions(PermissionCode.POINTS_ADJUST)
  async adjust(
    @TenantId() tenantId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: AdjustPointsDto,
    @CurrentUser() user: { id: string },
  ) {
    const result = await this.service.adjust(
      tenantId,
      userId,
      dto.amount,
      dto.reason,
      user.id,
    );
    await this.audit.write({
      tenantId,
      actorId: user.id,
      action: 'points.adjust',
      entityType: 'points',
      entityId: result.wallet.id,
      reason: dto.reason,
      afterData: { amount: dto.amount },
    });
    return result;
  }
}
