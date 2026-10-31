import { Module } from '@nestjs/common';
import { TenantOrmModule } from 'src/tenant/tenant-orm.module';
import { Round } from './entities/round.entity';
import { RoundColorStock } from './entities/round-color-stock.entity';
import { RoundService } from './round.service';
import { SettlementService } from './settlement.service';
import { RoundController } from './round.controller';
import { GameConfigModule } from 'src/game-config/game-config.module';
import { LiveModule } from 'src/live/live.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { PointsModule } from 'src/points/points.module';
import { PurchaseModule } from 'src/purchase/purchase.module';
import { PromoModule } from 'src/promo/promo.module';
import { AuditModule } from 'src/audit/audit.module';
import { RoundHistorySnapshot } from 'src/history/entities/round-history-snapshot.entity';

@Module({
  imports: [
    TenantOrmModule.forFeature([Round, RoundColorStock, RoundHistorySnapshot]),
    GameConfigModule,
    LiveModule,
    WalletModule,
    PointsModule,
    PurchaseModule,
    PromoModule,
    AuditModule,
  ],
  controllers: [RoundController],
  providers: [RoundService, SettlementService],
  exports: [RoundService, SettlementService],
})
export class RoundModule {}
