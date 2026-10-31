import { Module } from '@nestjs/common';
import { TenantOrmModule } from 'src/tenant/tenant-orm.module';
import { Purchase } from './entities/purchase.entity';
import { PurchaseService } from './purchase.service';
import { PurchaseController } from './purchase.controller';
import { WalletModule } from 'src/wallet/wallet.module';
import { AuditModule } from 'src/audit/audit.module';

@Module({
  imports: [
    TenantOrmModule.forFeature([Purchase]),
    WalletModule,
    AuditModule,
  ],
  controllers: [PurchaseController],
  providers: [PurchaseService],
  exports: [PurchaseService],
})
export class PurchaseModule {}
