import { Module, forwardRef } from '@nestjs/common';
import { TenantOrmModule } from 'src/tenant/tenant-orm.module';
import { Wallet } from './entities/wallet.entity';
import { WalletMovement } from './entities/wallet-movement.entity';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { AuditModule } from 'src/audit/audit.module';

@Module({
  imports: [
    TenantOrmModule.forFeature([Wallet, WalletMovement]),
    AuditModule,
  ],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
