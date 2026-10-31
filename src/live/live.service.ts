import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Live } from './entities/live.entity';
import { LiveParticipant } from './entities/live-participant.entity';
import { LiveStatus, PermissionCode, ROLE_ADMIN } from 'src/common/enums';
import { CreateLiveDto, UpdateLiveDto } from './dto/live.dto';
import { LivekitService } from './livekit.service';
import { RealtimeEmitterService } from 'src/realtime/realtime-emitter.service';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { listOrPaginate } from 'src/common/utils/pagination.helper';
import { AuditService } from 'src/audit/audit.service';

@Injectable()
export class LiveService {
  constructor(
    @InjectRepository(Live)
    private readonly lives: Repository<Live>,
    @InjectRepository(LiveParticipant)
    private readonly participants: Repository<LiveParticipant>,
    private readonly livekit: LivekitService,
    private readonly realtime: RealtimeEmitterService,
    private readonly audit: AuditService,
  ) {}

  async create(tenantId: string, dto: CreateLiveDto, userId: string) {
    const live = await this.lives.save(
      this.lives.create({
        tenantId,
        title: dto.title,
        description: dto.description,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        status: LiveStatus.SCHEDULED,
        createdBy: userId,
      }),
    );
    live.roomName = this.livekit.roomName(tenantId, live.id);
    await this.lives.save(live);
    await this.audit.write({
      tenantId,
      actorId: userId,
      action: 'live.create',
      entityType: 'live',
      entityId: live.id,
      afterData: { title: live.title, status: live.status },
    });
    return live;
  }

  findAll(tenantId: string, query: PaginationQueryDto) {
    const qb = this.lives
      .createQueryBuilder('l')
      .where('l.tenant_id = :tenantId', { tenantId })
      .orderBy('l.createdAt', 'DESC');
    if (query.status) qb.andWhere('l.status = :status', { status: query.status });
    if (query.search) {
      qb.andWhere('l.title ILIKE :s', { s: `%${query.search}%` });
    }
    return listOrPaginate(qb, query);
  }

  async findOne(tenantId: string, id: string) {
    const live = await this.lives.findOne({ where: { id, tenantId } });
    if (!live) throw new NotFoundException('Transmisión no encontrada');
    return live;
  }

  async update(tenantId: string, id: string, dto: UpdateLiveDto, userId: string) {
    const live = await this.findOne(tenantId, id);
    if (live.status === LiveStatus.ENDED) {
      throw new BadRequestException('No se puede editar una transmisión finalizada');
    }
    if (dto.title !== undefined) live.title = dto.title;
    if (dto.description !== undefined) live.description = dto.description;
    if (dto.scheduledAt !== undefined) {
      live.scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    }
    live.updatedBy = userId;
    return this.lives.save(live);
  }

  async start(tenantId: string, id: string, userId: string) {
    const live = await this.findOne(tenantId, id);
    // SCHEDULED → LIVE; LIVE → no-op; ENDED → reabrir
    if (live.status === LiveStatus.LIVE) return live;
    if (
      live.status !== LiveStatus.SCHEDULED &&
      live.status !== LiveStatus.ENDED
    ) {
      throw new BadRequestException(
        `No se puede iniciar una transmisión en estado ${live.status}`,
      );
    }
    const wasEnded = live.status === LiveStatus.ENDED;
    live.status = LiveStatus.LIVE;
    live.startedAt = wasEnded ? new Date() : (live.startedAt ?? new Date());
    live.endedAt = null;
    live.updatedBy = userId;
    await this.lives.save(live);
    this.realtime.emitToLive(tenantId, id, 'live:started', { liveId: id });
    await this.audit.write({
      tenantId,
      actorId: userId,
      action: 'live.start',
      entityType: 'live',
      entityId: id,
    });
    return live;
  }

  async end(tenantId: string, id: string, userId: string) {
    const live = await this.findOne(tenantId, id);
    if (live.status === LiveStatus.ENDED) return live;
    live.status = LiveStatus.ENDED;
    live.endedAt = new Date();
    live.updatedBy = userId;
    await this.lives.save(live);
    await this.participants
      .createQueryBuilder()
      .update(LiveParticipant)
      .set({ disconnectedAt: () => 'NOW()' })
      .where('tenant_id = :tenantId', { tenantId })
      .andWhere('live_id = :id', { id })
      .andWhere('disconnected_at IS NULL')
      .execute();
    this.realtime.emitToLive(tenantId, id, 'live:ended', { liveId: id });
    await this.audit.write({
      tenantId,
      actorId: userId,
      action: 'live.end',
      entityType: 'live',
      entityId: id,
    });
    return live;
  }

  async token(
    tenantId: string,
    id: string,
    user: { id: string; username?: string; permissionCodes?: string[] },
  ) {
    await this.findOne(tenantId, id);
    const canPublish =
      (user.permissionCodes ?? []).includes(PermissionCode.LIVE_MANAGE) ||
      (user.permissionCodes ?? []).includes(PermissionCode.SYSTEM_ADMIN);

    await this.participants.upsert(
      {
        tenantId,
        liveId: id,
        userId: user.id,
        connectedAt: new Date(),
        disconnectedAt: null,
      },
      ['liveId', 'userId'],
    );

    return this.livekit.createToken({
      tenantId,
      liveId: id,
      identity: user.id,
      name: user.username,
      canPublish,
    });
  }

  listParticipants(tenantId: string, liveId: string) {
    return this.participants
      .createQueryBuilder('lp')
      .where('lp.tenant_id = :tenantId', { tenantId })
      .andWhere('lp.live_id = :liveId', { liveId })
      .andWhere('lp.disconnected_at IS NULL')
      .orderBy('lp.connected_at', 'DESC')
      .getMany();
  }

  /** Espectadores conectados (sin admins / presentadores). */
  async countViewers(tenantId: string, liveId: string) {
    const rows = (await this.participants.manager.query(
      `SELECT COUNT(DISTINCT lp.user_id)::int AS count
       FROM live_participants lp
       INNER JOIN users u ON u.id = lp.user_id
       INNER JOIN roles r ON r.id = u.role_id
       WHERE lp.tenant_id = $1
         AND lp.live_id = $2
         AND lp.disconnected_at IS NULL
         AND r.name <> $3
         AND NOT EXISTS (
           SELECT 1
           FROM role_permissions rp
           INNER JOIN permissions p ON p.id = rp.permission_id
           WHERE rp.role_id = r.id
             AND p.code = ANY($4::text[])
         )`,
      [
        tenantId,
        liveId,
        ROLE_ADMIN,
        [
          PermissionCode.SYSTEM_ADMIN,
          PermissionCode.LIVE_MANAGE,
          PermissionCode.ROUND_MANAGE,
        ],
      ],
    )) as Array<{ count: number }>;
    return { liveId, viewers: Number(rows[0]?.count ?? 0) };
  }
}
