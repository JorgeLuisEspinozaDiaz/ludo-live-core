import { Module } from '@nestjs/common';
import { TenantOrmModule } from 'src/tenant/tenant-orm.module';
import { GameConfig } from './entities/game-config.entity';
import { GameConfigService } from './game-config.service';
import { GameConfigController } from './game-config.controller';

@Module({
  imports: [TenantOrmModule.forFeature([GameConfig])],
  controllers: [GameConfigController],
  providers: [GameConfigService],
  exports: [GameConfigService],
})
export class GameConfigModule {}
