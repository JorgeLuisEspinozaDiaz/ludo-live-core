import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, TenantId } from 'src/common/decorators/auth.decorators';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { PermissionCode } from 'src/common/enums';
import { RoundService } from './round.service';
import {
  CancelRoundDto,
  CreateRoundDto,
  FinishRoundDto,
  UpdateRoundDto,
} from './dto/round.dto';
import { PurchaseService } from 'src/purchase/purchase.service';
import { CreatePurchaseDto, CancelUserPurchasesDto } from 'src/purchase/dto/purchase.dto';
import { PromoService } from 'src/promo/promo.service';
import { CreatePromoDto, UpdatePromoDto } from 'src/promo/dto/promo.dto';

@ApiTags('Rounds')
@ApiBearerAuth()
@Controller()
export class RoundController {
  constructor(
    private readonly rounds: RoundService,
    private readonly purchases: PurchaseService,
    private readonly promos: PromoService,
  ) {}

  @Post('lives/:liveId/rounds')
  @RequirePermissions(PermissionCode.ROUND_MANAGE)
  create(
    @TenantId() tenantId: string,
    @Param('liveId', ParseUUIDPipe) liveId: string,
    @Body() dto: CreateRoundDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.rounds.create(tenantId, liveId, dto, user.id);
  }

  @Get('lives/:liveId/rounds')
  @RequirePermissions(PermissionCode.ROUND_VIEW)
  listByLive(
    @TenantId() tenantId: string,
    @Param('liveId', ParseUUIDPipe) liveId: string,
  ) {
    return this.rounds.listByLive(tenantId, liveId);
  }

  @Get('rounds/:id')
  @RequirePermissions(PermissionCode.ROUND_VIEW)
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.rounds.findOne(tenantId, id);
  }

  @Patch('rounds/:id')
  @RequirePermissions(PermissionCode.ROUND_MANAGE)
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoundDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.rounds.update(tenantId, id, dto, user.id);
  }

  @Post('rounds/:id/open-purchases')
  @RequirePermissions(PermissionCode.ROUND_MANAGE)
  open(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.rounds.openPurchases(tenantId, id, user.id);
  }

  @Post('rounds/:id/close-purchases')
  @RequirePermissions(PermissionCode.ROUND_MANAGE)
  close(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.rounds.closePurchases(tenantId, id, user.id);
  }

  @Post('rounds/:id/finish')
  @RequirePermissions(PermissionCode.ROUND_MANAGE)
  finish(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FinishRoundDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.rounds.finish(tenantId, id, dto, user.id);
  }

  @Post('rounds/:id/cancel')
  @RequirePermissions(PermissionCode.ROUND_MANAGE)
  cancel(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelRoundDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.rounds.cancel(tenantId, id, dto, user.id);
  }

  @Get('rounds/:id/inventory')
  @RequirePermissions(PermissionCode.ROUND_VIEW)
  inventory(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.rounds.inventory(tenantId, id);
  }

  @Post('rounds/:id/purchases')
  @RequirePermissions(PermissionCode.PURCHASE_CREATE)
  buy(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePurchaseDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.purchases.create(tenantId, id, user.id, dto);
  }

  @Get('rounds/:id/purchases')
  @RequirePermissions(PermissionCode.ROUND_VIEW)
  listPurchases(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.purchases.listByRound(tenantId, id);
  }

  @Get('rounds/:id/wallets')
  @RequirePermissions(PermissionCode.ROUND_VIEW)
  roundWallets(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.purchases.roundWalletsView(tenantId, id);
  }

  @Post('rounds/:id/purchases/cancel-user')
  @RequirePermissions(PermissionCode.PURCHASE_CANCEL)
  cancelUser(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelUserPurchasesDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.purchases.cancelUser(tenantId, id, user.id, dto);
  }

  @Post('rounds/:id/promos')
  @RequirePermissions(PermissionCode.PROMO_MANAGE)
  createPromo(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePromoDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.promos.create(tenantId, id, dto, user.id);
  }

  @Get('rounds/:id/promos')
  @RequirePermissions(PermissionCode.ROUND_VIEW)
  listPromos(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.promos.list(tenantId, id);
  }

  @Patch('promos/:promoId')
  @RequirePermissions(PermissionCode.PROMO_MANAGE)
  updatePromo(
    @TenantId() tenantId: string,
    @Param('promoId', ParseUUIDPipe) promoId: string,
    @Body() dto: UpdatePromoDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.promos.update(tenantId, promoId, dto, user.id);
  }
}
