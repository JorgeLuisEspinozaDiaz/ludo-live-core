import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, TenantId } from 'src/common/decorators/auth.decorators';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { PermissionCode } from 'src/common/enums';
import { GameConfigService } from './game-config.service';
import { UpdateGameConfigDto } from './dto/update-game-config.dto';

@ApiTags('GameConfig')
@ApiBearerAuth()
@Controller('game-config')
export class GameConfigController {
  constructor(private readonly service: GameConfigService) {}

  @Get()
  @RequirePermissions(PermissionCode.LIVE_VIEW)
  get(@TenantId() tenantId: string) {
    return this.service.getOrCreate(tenantId);
  }

  @Patch()
  @RequirePermissions(PermissionCode.GAME_CONFIG)
  update(
    @TenantId() tenantId: string,
    @Body() dto: UpdateGameConfigDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.update(tenantId, dto, user?.id);
  }
}
