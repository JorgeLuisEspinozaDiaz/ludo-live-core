import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken } from 'livekit-server-sdk';

@Injectable()
export class LivekitService {
  private readonly logger = new Logger(LivekitService.name);

  constructor(private readonly config: ConfigService) {}

  roomName(tenantId: string, liveId: string) {
    return `${tenantId}:${liveId}`;
  }

  async createToken(opts: {
    tenantId: string;
    liveId: string;
    identity: string;
    name?: string;
    canPublish: boolean;
  }) {
    const apiKey = this.config.get<string>('LIVEKIT_API_KEY');
    const apiSecret = this.config.get<string>('LIVEKIT_API_SECRET');
    // URL que usa el NAVEGADOR (no el hostname interno de Docker)
    const publicUrl =
      this.config.get<string>('LIVEKIT_PUBLIC_URL') ??
      this.config.get<string>('LIVEKIT_URL') ??
      null;

    if (!apiKey || !apiSecret) {
      this.logger.warn('LIVEKIT_API_KEY/SECRET no configurados');
      return {
        token: null as string | null,
        roomName: this.roomName(opts.tenantId, opts.liveId),
        url: publicUrl,
        mock: true,
      };
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: opts.identity,
      name: opts.name ?? opts.identity,
    });
    at.addGrant({
      roomJoin: true,
      room: this.roomName(opts.tenantId, opts.liveId),
      canPublish: opts.canPublish,
      canSubscribe: true,
      canPublishData: opts.canPublish,
    });

    return {
      token: await at.toJwt(),
      roomName: this.roomName(opts.tenantId, opts.liveId),
      url: publicUrl,
      mock: false,
    };
  }
}
