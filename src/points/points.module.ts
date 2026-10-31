import { Module } from '@nestjs/common';
import { TenantOrmModule } from 'src/tenant/tenant-orm.module';
import { PointsWallet } from './entities/points-wallet.entity';
import { PointsMovement } from './entities/points-movement.entity';
import { PointsService } from './points.service';
import { PointsController } from './points.controller';
import { GameConfigModule } from 'src/game-config/game-config.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { AuditModule } from 'src/audit/audit.module';

@Module({
  imports: [
    TenantOrmModule.forFeature([PointsWallet, PointsMovement]),
    GameConfigModule,
    WalletModule,
    AuditModule,
  ],
  controllers: [PointsController],
  providers: [PointsService],
  exports: [PointsService],
})
export class PointsModule {}
