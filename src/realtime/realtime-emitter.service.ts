import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class RealtimeEmitterService {
  private readonly logger = new Logger(RealtimeEmitterService.name);
  private server?: Server;

  setServer(server: Server) {
    this.server = server;
  }

  liveRoom(tenantId: string, liveId: string) {
    return `tenant:${tenantId}:live:${liveId}`;
  }

  userRoom(tenantId: string, userId: string) {
    return `tenant:${tenantId}:user:${userId}`;
  }

  emitToLive(tenantId: string, liveId: string, event: string, payload: unknown) {
    if (!this.server) {
      this.logger.debug(`No socket server; skip ${event}`);
      return;
    }
    this.server.to(this.liveRoom(tenantId, liveId)).emit(event, payload);
  }

  emitToUser(tenantId: string, userId: string, event: string, payload: unknown) {
    if (!this.server) return;
    this.server.to(this.userRoom(tenantId, userId)).emit(event, payload);
  }
}
