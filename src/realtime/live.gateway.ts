import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { RealtimeEmitterService } from './realtime-emitter.service';
import { TenantConnectionService } from 'src/tenant/tenant-connection.service';
import { LivePresenceService } from './live-presence.service';
import { User } from 'src/user/entities/user.entity';
import { PermissionCode } from 'src/common/enums';

type AuthedSocket = Socket & {
  data: {
    userId?: string;
    username?: string;
    tenantId?: string;
    permissionCodes?: string[];
    joinedLives?: Set<string>;
  };
};

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  namespace: '/live',
})
export class LiveGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(LiveGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly emitter: RealtimeEmitterService,
    private readonly tenants: TenantConnectionService,
    private readonly presence: LivePresenceService,
  ) {}

  afterInit(server: Server) {
    this.emitter.setServer(server);
    server.use(async (socket: AuthedSocket, next) => {
      try {
        const token =
          (socket.handshake.auth?.token as string) ||
          (socket.handshake.headers.authorization?.replace('Bearer ', '') ??
            '');
        if (!token) return next(new Error('Unauthorized'));
        const payload = this.jwt.verify<{ sub: string; tenantId: string }>(
          token,
          {
            secret: this.config.get<string>(
              'JWT_SECRET',
              'change-me-wost-jwt-secret',
            ),
          },
        );
        const ds = await this.tenants.getByTenantId(payload.tenantId);
        const user = await ds.getRepository(User).findOne({
          where: { id: payload.sub },
          relations: ['role', 'role.permissions'],
        });
        if (!user) return next(new Error('Unauthorized'));
        socket.data.userId = user.id;
        socket.data.username = user.username;
        socket.data.tenantId = user.tenantId;
        socket.data.permissionCodes = (user.role?.permissions ?? []).map(
          (p) => p.code,
        );
        socket.data.joinedLives = new Set();
        next();
      } catch (err) {
        this.logger.warn(`WS auth failed: ${(err as Error).message}`);
        next(new Error('Unauthorized'));
      }
    });
  }

  handleConnection(client: AuthedSocket) {
    const tenantId = client.data.tenantId;
    const userId = client.data.userId;
    if (tenantId && userId) {
      void client.join(this.emitter.userRoom(tenantId, userId));
    }
  }

  async handleDisconnect(client: AuthedSocket) {
    const tenantId = client.data.tenantId;
    const userId = client.data.userId;
    const lives = [...(client.data.joinedLives ?? [])];
    if (!tenantId || !userId || !lives.length) return;

    for (const liveId of lives) {
      await this.leavePresenceIfAlone(client, tenantId, liveId, userId);
    }
  }

  private async leavePresenceIfAlone(
    client: AuthedSocket,
    tenantId: string,
    liveId: string,
    userId: string,
  ) {
    const room = this.emitter.liveRoom(tenantId, liveId);
    try {
      const sockets = await this.server.in(room).fetchSockets();
      const stillThere = sockets.some(
        (s) => s.id !== client.id && s.data?.userId === userId,
      );
      if (!stillThere) {
        await this.presence.markLeft(tenantId, liveId, userId);
        const viewers = await this.presence.countViewers(tenantId, liveId);
        this.emitter.emitToLive(tenantId, liveId, 'live:presence', {
          liveId,
          userId,
          status: 'left',
          viewers,
        });
      }
    } catch (err) {
      this.logger.warn(
        `leavePresence failed: ${(err as Error).message}`,
      );
    }
  }

  @SubscribeMessage('joinLive')
  async joinLive(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { liveId: string },
  ) {
    const tenantId = client.data.tenantId!;
    const userId = client.data.userId!;
    const codes = client.data.permissionCodes ?? [];
    const canView =
      codes.includes(PermissionCode.LIVE_VIEW) ||
      codes.includes(PermissionCode.LIVE_MANAGE) ||
      codes.includes(PermissionCode.SYSTEM_ADMIN);
    if (!canView) return { ok: false, error: 'Forbidden' };
    if (!body?.liveId) return { ok: false, error: 'Empty' };

    const room = this.emitter.liveRoom(tenantId, body.liveId);
    await client.join(room);
    await client.join(this.emitter.userRoom(tenantId, userId));
    client.data.joinedLives ??= new Set();
    client.data.joinedLives.add(body.liveId);

    await this.presence.markJoined(tenantId, body.liveId, userId);
    const viewers = await this.presence.countViewers(tenantId, body.liveId);
    this.emitter.emitToLive(tenantId, body.liveId, 'live:presence', {
      liveId: body.liveId,
      userId,
      username: client.data.username,
      status: 'joined',
      viewers,
    });

    return { ok: true, room, viewers };
  }

  @SubscribeMessage('leaveLive')
  async leaveLive(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { liveId: string },
  ) {
    const tenantId = client.data.tenantId!;
    const userId = client.data.userId!;
    if (!body?.liveId) return { ok: false, error: 'Empty' };

    await client.leave(this.emitter.liveRoom(tenantId, body.liveId));
    client.data.joinedLives?.delete(body.liveId);
    await this.leavePresenceIfAlone(client, tenantId, body.liveId, userId);
    return { ok: true };
  }

  @SubscribeMessage('chat:send')
  async chatSend(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { liveId: string; text: string },
  ) {
    const tenantId = client.data.tenantId!;
    const codes = client.data.permissionCodes ?? [];
    const canChat =
      codes.includes(PermissionCode.LIVE_VIEW) ||
      codes.includes(PermissionCode.LIVE_MANAGE) ||
      codes.includes(PermissionCode.SYSTEM_ADMIN);
    if (!canChat) return { ok: false, error: 'Forbidden' };

    const text = (body?.text ?? '').trim().slice(0, 280);
    if (!body?.liveId || !text) return { ok: false, error: 'Empty' };

    const room = this.emitter.liveRoom(tenantId, body.liveId);
    await client.join(room);
    await client.join(this.emitter.userRoom(tenantId, client.data.userId!));
    client.data.joinedLives ??= new Set();
    client.data.joinedLives.add(body.liveId);

    const message = {
      id: `${Date.now()}-${client.data.userId}`,
      liveId: body.liveId,
      userId: client.data.userId!,
      username: client.data.username ?? 'Jugador',
      text,
      at: new Date().toISOString(),
    };
    this.emitter.emitToLive(tenantId, body.liveId, 'chat:message', message);
    return { ok: true, message };
  }
}
