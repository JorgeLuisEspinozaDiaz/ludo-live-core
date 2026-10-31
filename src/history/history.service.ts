import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoundHistorySnapshot } from './entities/round-history-snapshot.entity';
import { PermissionCode } from 'src/common/enums';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { listOrPaginate } from 'src/common/utils/pagination.helper';

@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(RoundHistorySnapshot)
    private readonly snapshots: Repository<RoundHistorySnapshot>,
  ) {}

  async list(
    tenantId: string,
    query: PaginationQueryDto & { liveId?: string; userId?: string },
    viewer: { id: string; permissionCodes?: string[] },
  ) {
    const isAdmin =
      (viewer.permissionCodes ?? []).includes(PermissionCode.SYSTEM_ADMIN) ||
      (viewer.permissionCodes ?? []).includes(PermissionCode.WALLET_VIEW_ALL);

    const qb = this.snapshots
      .createQueryBuilder('h')
      .where('h.tenant_id = :tenantId', { tenantId })
      .orderBy('h.finishedAt', 'DESC');

    if (query.liveId) {
      qb.andWhere('h.live_id = :liveId', { liveId: query.liveId });
    }

    if (!isAdmin) {
      // Solo rondas donde el jugador aparece en el snapshot
      qb.andWhere(`h.payload -> 'participants' @> :mine::jsonb`, {
        mine: JSON.stringify([{ userId: viewer.id }]),
      });
    }

    const page = await listOrPaginate(qb, query);
    if (isAdmin) return page;

    // Participante: filtrar payload a solo su detalle
    const data = (page as { data: RoundHistorySnapshot[] }).data.map((s) =>
      this.scopeSnapshot(s, viewer.id),
    );
    return { ...(page as object), data };
  }

  async findOne(
    tenantId: string,
    id: string,
    viewer: { id: string; permissionCodes?: string[] },
  ) {
    const snap = await this.snapshots.findOne({ where: { id, tenantId } });
    if (!snap) throw new NotFoundException('Historial no encontrado');
    const isAdmin =
      (viewer.permissionCodes ?? []).includes(PermissionCode.SYSTEM_ADMIN) ||
      (viewer.permissionCodes ?? []).includes(PermissionCode.WALLET_VIEW_ALL);
    return isAdmin ? snap : this.scopeSnapshot(snap, viewer.id);
  }

  private scopeSnapshot(snap: RoundHistorySnapshot, userId: string) {
    const payload = snap.payload as {
      participants?: Array<{ userId: string }>;
      [k: string]: unknown;
    };
    const mine = (payload.participants ?? []).filter((p) => p.userId === userId);
    return {
      ...snap,
      payload: { ...payload, participants: mine },
    };
  }

  async exportCsv(
    tenantId: string,
    viewer: { id: string; permissionCodes?: string[] },
  ) {
    const canExport =
      (viewer.permissionCodes ?? []).includes(PermissionCode.HISTORY_EXPORT) ||
      (viewer.permissionCodes ?? []).includes(PermissionCode.SYSTEM_ADMIN);
    if (!canExport) {
      throw new ForbiddenException('Sin permiso de exportación');
    }
    const rows = await this.snapshots.find({
      where: { tenantId },
      order: { finishedAt: 'DESC' },
    });
    const lines = [
      'roundId,liveId,winnerColor,finishedAt,participants',
      ...rows.map((r) => {
        const parts = (
          (r.payload as { participants?: unknown[] }).participants ?? []
        ).length;
        return `${r.roundId},${r.liveId},${r.winnerColor},${r.finishedAt.toISOString()},${parts}`;
      }),
    ];
    return lines.join('\n');
  }
}
