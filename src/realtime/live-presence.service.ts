import { Injectable } from '@nestjs/common';
import { TenantConnectionService } from 'src/tenant/tenant-connection.service';
import { LiveParticipant } from 'src/live/entities/live-participant.entity';
import { PermissionCode, ROLE_ADMIN } from 'src/common/enums';

/** Presencia en live (sin DataSource request-scoped). */
@Injectable()
export class LivePresenceService {
  constructor(private readonly tenants: TenantConnectionService) {}

  async markJoined(tenantId: string, liveId: string, userId: string) {
    const ds = await this.tenants.getByTenantId(tenantId);
    await ds.getRepository(LiveParticipant).upsert(
      {
        tenantId,
        liveId,
        userId,
        connectedAt: new Date(),
        disconnectedAt: null,
      },
      ['liveId', 'userId'],
    );
  }

  async markLeft(tenantId: string, liveId: string, userId: string) {
    const ds = await this.tenants.getByTenantId(tenantId);
    await ds
      .getRepository(LiveParticipant)
      .createQueryBuilder()
      .update(LiveParticipant)
      .set({ disconnectedAt: () => 'NOW()' })
      .where('tenant_id = :tenantId', { tenantId })
      .andWhere('live_id = :liveId', { liveId })
      .andWhere('user_id = :userId', { userId })
      .andWhere('disconnected_at IS NULL')
      .execute();
  }

  async countViewers(tenantId: string, liveId: string): Promise<number> {
    const ds = await this.tenants.getByTenantId(tenantId);
    const rows = (await ds.query(
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
    return Number(rows[0]?.count ?? 0);
  }
}
