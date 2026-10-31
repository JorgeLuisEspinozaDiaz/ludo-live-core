import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, TenantId } from 'src/common/decorators/auth.decorators';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { PermissionCode } from 'src/common/enums';
import { PurchaseService } from './purchase.service';
import { CancelPurchaseDto } from './dto/purchase.dto';

@ApiTags('Purchases')
@ApiBearerAuth()
@Controller('purchases')
export class PurchaseController {
  constructor(private readonly service: PurchaseService) {}

  @Post(':id/cancel')
  @RequirePermissions(PermissionCode.PURCHASE_CANCEL)
  cancel(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelPurchaseDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.cancelOne(tenantId, id, user.id, dto);
  }
}
