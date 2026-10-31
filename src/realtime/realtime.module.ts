import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeEmitterService } from './realtime-emitter.service';
import { LivePresenceService } from './live-presence.service';
import { LiveGateway } from './live.gateway';

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [RealtimeEmitterService, LivePresenceService, LiveGateway],
  exports: [RealtimeEmitterService, LivePresenceService],
})
export class RealtimeModule {}
