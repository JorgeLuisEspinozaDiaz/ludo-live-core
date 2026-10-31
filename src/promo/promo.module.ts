import { Module } from '@nestjs/common';
import { TenantOrmModule } from 'src/tenant/tenant-orm.module';
import { Promo } from './entities/promo.entity';
import { Round } from 'src/round/entities/round.entity';
import { RoundColorStock } from 'src/round/entities/round-color-stock.entity';
import { PromoService } from './promo.service';

@Module({
  imports: [TenantOrmModule.forFeature([Promo, Round, RoundColorStock])],
  providers: [PromoService],
  exports: [PromoService],
})
export class PromoModule {}
