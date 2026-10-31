import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, TenantId } from 'src/common/decorators/auth.decorators';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { PermissionCode } from 'src/common/enums';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { WalletService } from './wallet.service';
import { AdjustWalletDto, RegisterPaymentDto } from './dto/wallet.dto';
import { RealtimeEmitterService } from 'src/realtime/realtime-emitter.service';
import { AuditService } from 'src/audit/audit.service';

@ApiTags('Wallets')
@ApiBearerAuth()
@Controller('wallets')
export class WalletController {
  constructor(
    private readonly service: WalletService,
    private readonly realtime: RealtimeEmitterService,
    private readonly audit: AuditService,
  ) {}

  @Get('me')
  @RequirePermissions(PermissionCode.WALLET_VIEW_OWN)
  me(@TenantId() tenantId: string, @CurrentUser() user: { id: string }) {
    return this.service.getMine(tenantId, user.id);
  }

  @Get()
  @RequirePermissions(PermissionCode.WALLET_VIEW_ALL)
  list(@TenantId() tenantId: string, @Query() query: PaginationQueryDto) {
    return this.service.list(tenantId, query);
  }

  @Get(':userId')
  @RequirePermissions(PermissionCode.WALLET_VIEW_ALL)
  byUser(
    @TenantId() tenantId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.service.getByUser(tenantId, userId);
  }

  @Get(':userId/movements')
  @RequirePermissions(PermissionCode.WALLET_VIEW_ALL)
  movements(
    @TenantId() tenantId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.service.listMovements(tenantId, userId, query);
  }

  @Post(':userId/payments')
  @RequirePermissions(PermissionCode.WALLET_PAYMENT)
  async payment(
    @TenantId() tenantId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: RegisterPaymentDto,
    @CurrentUser() user: { id: string },
  ) {
    const result = await this.service.registerPayment(
      tenantId,
      userId,
      dto.amountCents,
      user.id,
      { method: dto.method, reference: dto.reference, note: dto.note },
    );
    this.realtime.emitToUser(tenantId, userId, 'wallet:updated', {
      balanceCents: result.wallet.balanceCents,
    });
    await this.audit.write({
      tenantId,
      actorId: user.id,
      action: 'wallet.payment',
      entityType: 'wallet',
      entityId: result.wallet.id,
      afterData: { amountCents: dto.amountCents },
    });
    return {
      movement: result.movement,
      wallet: this.service.toPublic(result.wallet),
    };
  }

  @Post(':userId/adjustments')
  @RequirePermissions(PermissionCode.WALLET_ADJUST)
  async adjust(
    @TenantId() tenantId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: AdjustWalletDto,
    @CurrentUser() user: { id: string },
  ) {
    const result = await this.service.adjust(
      tenantId,
      userId,
      dto.amountCents,
      dto.reason,
      user.id,
    );
    this.realtime.emitToUser(tenantId, userId, 'wallet:updated', {
      balanceCents: result.wallet.balanceCents,
    });
    await this.audit.write({
      tenantId,
      actorId: user.id,
      action: 'wallet.adjust',
      entityType: 'wallet',
      entityId: result.wallet.id,
      reason: dto.reason,
      afterData: { amountCents: dto.amountCents },
    });
    return {
      movement: result.movement,
      wallet: this.service.toPublic(result.wallet),
    };
  }
}
