import { Module } from '@nestjs/common';
import { TenantOrmModule } from 'src/tenant/tenant-orm.module';
import { Live } from './entities/live.entity';
import { LiveParticipant } from './entities/live-participant.entity';
import { LiveService } from './live.service';
import { LiveController } from './live.controller';
import { LivekitService } from './livekit.service';
import { RealtimeModule } from 'src/realtime/realtime.module';
import { AuditModule } from 'src/audit/audit.module';

@Module({
  imports: [
    TenantOrmModule.forFeature([Live, LiveParticipant]),
    RealtimeModule,
    AuditModule,
  ],
  controllers: [LiveController],
  providers: [LiveService, LivekitService],
  exports: [LiveService, LivekitService],
})
export class LiveModule {}
