import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { Purchase } from './entities/purchase.entity';
import { Round } from 'src/round/entities/round.entity';
import { Promo } from 'src/promo/entities/promo.entity';
import { Wallet } from 'src/wallet/entities/wallet.entity';
import { User } from 'src/user/entities/user.entity';
import {
  PermissionCode,
  PurchaseStatus,
  ROLE_ADMIN,
  RoundStatus,
  WalletMovementType,
} from 'src/common/enums';
import {
  CancelPurchaseDto,
  CancelUserPurchasesDto,
  CreatePurchaseDto,
} from './dto/purchase.dto';
import { WalletService } from 'src/wallet/wallet.service';
import { RealtimeEmitterService } from 'src/realtime/realtime-emitter.service';
import { AuditService } from 'src/audit/audit.service';

@Injectable()
export class PurchaseService {
  constructor(
    private readonly ds: DataSource,
    private readonly walletService: WalletService,
    private readonly realtime: RealtimeEmitterService,
    private readonly audit: AuditService,
  ) {}

  async create(
    tenantId: string,
    roundId: string,
    userId: string,
    dto: CreatePurchaseDto,
  ) {
    const result = await this.ds.transaction(async (manager) => {
      const round = await manager.getRepository(Round).findOne({
        where: { id: roundId, tenantId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!round) throw new NotFoundException('Ronda no encontrada');
      if (round.status !== RoundStatus.PURCHASES_OPEN) {
        throw new ConflictException(
          'Las compras solo se permiten con la ronda en PURCHASES_OPEN',
        );
      }

      const stockUpdate = await manager.query(
        `UPDATE round_color_stocks
         SET sold = sold + $1, updated_at = NOW()
         WHERE round_id = $2 AND color = $3 AND sold + $1 <= capacity
         RETURNING *`,
        [dto.quantity, roundId, dto.color],
      );
      if (!stockUpdate.length) {
        throw new UnprocessableEntityException(
          'No hay cupo suficiente para ese color',
        );
      }

      // Promo del color: explícita (promoId) o la activa con cupo. Las casillas
      // que excedan el cupo promo se registran como compra normal (×1).
      const promoRows: Array<{ id: string; multiplier: number; slots: number; sold: number }> =
        dto.promoId
          ? await manager.query(
              `SELECT id, multiplier, slots, sold FROM promos
               WHERE id = $1 AND tenant_id = $2 AND round_id = $3
                 AND active = true AND color = $4
               FOR UPDATE`,
              [dto.promoId, tenantId, roundId, dto.color],
            )
          : await manager.query(
              `SELECT id, multiplier, slots, sold FROM promos
               WHERE tenant_id = $1 AND round_id = $2 AND active = true
                 AND color = $3 AND sold < slots
               ORDER BY multiplier DESC, created_at ASC
               LIMIT 1
               FOR UPDATE`,
              [tenantId, roundId, dto.color],
            );
      if (dto.promoId && !promoRows.length) {
        throw new UnprocessableEntityException('Promo no disponible');
      }

      const promo = promoRows[0];
      const promoQty = promo
        ? Math.min(dto.quantity, Math.max(0, Number(promo.slots) - Number(promo.sold)))
        : 0;
      const normalQty = dto.quantity - promoQty;

      if (promo && promoQty > 0) {
        await manager.query(
          `UPDATE promos SET sold = sold + $1, updated_at = NOW() WHERE id = $2`,
          [promoQty, promo.id],
        );
      }

      const purchaseRepo = manager.getRepository(Purchase);
      const rows: Purchase[] = [];
      if (promo && promoQty > 0) {
        rows.push(
          purchaseRepo.create({
            tenantId,
            roundId,
            userId,
            color: dto.color,
            quantity: promoQty,
            unitPriceCents: round.priceCents,
            multiplier: Number(promo.multiplier),
            promoId: promo.id,
            status: PurchaseStatus.ACTIVE,
            createdBy: userId,
          }),
        );
      }
      if (normalQty > 0) {
        rows.push(
          purchaseRepo.create({
            tenantId,
            roundId,
            userId,
            color: dto.color,
            quantity: normalQty,
            unitPriceCents: round.priceCents,
            multiplier: 1,
            promoId: null,
            status: PurchaseStatus.ACTIVE,
            createdBy: userId,
          }),
        );
      }
      const saved = await purchaseRepo.save(rows);
      const purchase = saved[0];

      const charge = -(dto.quantity * round.priceCents);
      const { wallet } = await this.walletService.applyDelta(manager, {
        tenantId,
        userId,
        type: WalletMovementType.PURCHASE,
        amountCents: charge,
        authorId: userId,
        roundId,
        purchaseId: purchase.id,
        note: `Compra ${dto.quantity} ${dto.color}`,
      });

      await this.audit.write(
        {
          tenantId,
          actorId: userId,
          action: 'purchase.create',
          entityType: 'purchase',
          entityId: purchase.id,
          afterData: {
            color: dto.color,
            quantity: dto.quantity,
            promoQuantity: promoQty,
            promoMultiplier: promo ? Number(promo.multiplier) : null,
            charge,
            balanceCents: wallet.balanceCents,
          },
        },
        manager,
      );

      return {
        purchase,
        wallet,
        liveId: round.liveId,
        stock: stockUpdate[0],
        promoId: promo && promoQty > 0 ? promo.id : null,
      };
    });

    const buyer = await this.ds.getRepository(User).findOne({
      where: { id: userId, tenantId },
      select: ['id', 'username'],
    });
    this.realtime.emitToLive(tenantId, result.liveId, 'purchase:created', {
      purchaseId: result.purchase.id,
      roundId,
      userId,
      username: buyer?.username ?? 'Jugador',
      color: dto.color,
      quantity: dto.quantity,
    });
    this.realtime.emitToLive(tenantId, result.liveId, 'inventory:updated', {
      roundId,
      color: dto.color,
      sold: Number(result.stock.sold),
      capacity: Number(result.stock.capacity),
    });
    if (result.promoId) {
      // Refresca "quedan N cupos promo" en los clientes
      this.realtime.emitToLive(tenantId, result.liveId, 'promo:activated', {
        promoId: result.promoId,
        roundId,
        color: dto.color,
      });
    }
    this.realtime.emitToUser(tenantId, userId, 'wallet:updated', {
      balanceCents: result.wallet.balanceCents,
    });

    return {
      ...result.purchase,
      wallet: this.walletService.toPublic(result.wallet),
    };
  }

  async cancelOne(
    tenantId: string,
    purchaseId: string,
    adminId: string,
    dto: CancelPurchaseDto,
  ) {
    return this.cancelPurchases(tenantId, adminId, dto, { purchaseId });
  }

  async cancelUser(
    tenantId: string,
    roundId: string,
    adminId: string,
    dto: CancelUserPurchasesDto,
  ) {
    return this.cancelPurchases(tenantId, adminId, dto, {
      roundId,
      userId: dto.userId,
    });
  }

  private async cancelPurchases(
    tenantId: string,
    adminId: string,
    dto: CancelPurchaseDto,
    filter: { purchaseId?: string; roundId?: string; userId?: string },
  ) {
    const preview = await this.ds.transaction(async (manager) => {
      const qb = manager
        .getRepository(Purchase)
        .createQueryBuilder('p')
        .setLock('pessimistic_write')
        .where('p.tenant_id = :tenantId AND p.status = :status', {
          tenantId,
          status: PurchaseStatus.ACTIVE,
        });
      if (filter.purchaseId) {
        qb.andWhere('p.id = :purchaseId', { purchaseId: filter.purchaseId });
      }
      if (filter.roundId) {
        qb.andWhere('p.round_id = :roundId', { roundId: filter.roundId });
      }
      if (filter.userId) {
        qb.andWhere('p.user_id = :userId', { userId: filter.userId });
      }
      const purchases = await qb.getMany();
      if (!purchases.length) {
        throw new NotFoundException('No hay compras ACTIVE para cancelar');
      }

      for (const p of purchases) {
        const round = await manager.getRepository(Round).findOne({
          where: { id: p.roundId, tenantId },
        });
        if (!round || round.status === RoundStatus.FINISHED) {
          throw new ConflictException(
            'No se pueden cancelar compras de una ronda finalizada',
          );
        }
      }

      const userIds = [...new Set(purchases.map((p) => p.userId))];
      for (const uid of userIds) {
        const wallet = await manager.getRepository(Wallet).findOne({
          where: { tenantId, userId: uid },
          lock: { mode: 'pessimistic_write' },
        });
        if (wallet && wallet.balanceCents >= 0 && !dto.force) {
          throw new ConflictException({
            message:
              'El saldo del usuario es >= 0. Confirme con force=true para cancelar.',
            warning: true,
            balanceCents: wallet.balanceCents,
            userId: uid,
          });
        }
      }

      const cancelled: Purchase[] = [];
      let liveId = '';
      for (const p of purchases) {
        const round = await manager.getRepository(Round).findOneByOrFail({
          id: p.roundId,
        });
        liveId = round.liveId;

        await manager.query(
          `UPDATE round_color_stocks
           SET sold = sold - $1, updated_at = NOW()
           WHERE round_id = $2 AND color = $3 AND sold >= $1`,
          [p.quantity, p.roundId, p.color],
        );
        if (p.promoId) {
          await manager.query(
            `UPDATE promos
             SET sold = sold - $1, updated_at = NOW()
             WHERE id = $2 AND sold >= $1`,
            [p.quantity, p.promoId],
          );
        }

        p.status = PurchaseStatus.CANCELLED;
        p.cancelReason = dto.reason;
        p.cancelledAt = new Date();
        p.cancelledBy = adminId;
        await manager.getRepository(Purchase).save(p);

        const refund = p.quantity * p.unitPriceCents;
        await this.walletService.applyDelta(manager, {
          tenantId,
          userId: p.userId,
          type: WalletMovementType.PURCHASE_CANCEL,
          amountCents: refund,
          authorId: adminId,
          roundId: p.roundId,
          purchaseId: p.id,
          note: dto.reason,
        });

        cancelled.push(p);
        await this.audit.write(
          {
            tenantId,
            actorId: adminId,
            action: 'purchase.cancel',
            entityType: 'purchase',
            entityId: p.id,
            reason: dto.reason,
            afterData: { quantity: p.quantity, color: p.color },
          },
          manager,
        );
      }

      return { cancelled, liveId };
    });

    this.realtime.emitToLive(tenantId, preview.liveId, 'purchase:cancelled', {
      purchaseIds: preview.cancelled.map((p) => p.id),
    });
    this.realtime.emitToLive(tenantId, preview.liveId, 'inventory:updated', {
      roundId: preview.cancelled[0]?.roundId,
    });

    return preview.cancelled;
  }

  async listByRound(tenantId: string, roundId: string) {
    const purchases = await this.ds.getRepository(Purchase).find({
      where: { tenantId, roundId },
      order: { createdAt: 'DESC' },
    });
    const names = await this.usernamesByIds(
      tenantId,
      purchases.map((p) => p.userId),
    );
    return purchases.map((p) => ({
      ...p,
      username: names.get(p.userId) ?? null,
    }));
  }

  async roundWalletsView(tenantId: string, roundId: string) {
    const round = await this.ds.getRepository(Round).findOne({
      where: { id: roundId, tenantId },
    });
    if (!round) throw new NotFoundException('Ronda no encontrada');

    // Activos en el live + quien tiene compras (para registrar pagos aunque falle la presencia)
    const liveParts = (await this.ds.query(
      `SELECT DISTINCT user_id AS "userId"
       FROM live_participants
       WHERE tenant_id = $1 AND live_id = $2 AND disconnected_at IS NULL`,
      [tenantId, round.liveId],
    )) as Array<{ userId: string }>;

    const byUser = new Map<
      string,
      { userId: string; colors: Record<string, number>; online: boolean }
    >();
    for (const row of liveParts) {
      byUser.set(row.userId, { userId: row.userId, colors: {}, online: true });
    }

    const purchases = await this.ds.getRepository(Purchase).find({
      where: { tenantId, roundId, status: PurchaseStatus.ACTIVE },
    });
    for (const p of purchases) {
      if (!byUser.has(p.userId)) {
        byUser.set(p.userId, {
          userId: p.userId,
          colors: {},
          online: false,
        });
      }
      const row = byUser.get(p.userId)!;
      row.colors[p.color] = (row.colors[p.color] ?? 0) + p.quantity;
    }

    let userIds = [...byUser.keys()];
    // No mostrar mochilas de administradores / presentadores del live
    if (userIds.length) {
      const staffRows = (await this.ds.query(
        `SELECT DISTINCT u.id AS "userId"
         FROM users u
         INNER JOIN roles r ON r.id = u.role_id
         LEFT JOIN role_permissions rp ON rp.role_id = r.id
         LEFT JOIN permissions p ON p.id = rp.permission_id
         WHERE u.tenant_id = $1
           AND u.id = ANY($2::uuid[])
           AND (
             r.name = $3
             OR p.code = ANY($4::text[])
           )`,
        [
          tenantId,
          userIds,
          ROLE_ADMIN,
          [
            PermissionCode.SYSTEM_ADMIN,
            PermissionCode.LIVE_MANAGE,
            PermissionCode.ROUND_MANAGE,
          ],
        ],
      )) as Array<{ userId: string }>;
      const staffIds = new Set(staffRows.map((r) => r.userId));
      for (const id of staffIds) byUser.delete(id);
      userIds = [...byUser.keys()];
    }

    const names = await this.usernamesByIds(tenantId, userIds);
    const pointsByUser = new Map<string, number>();
    if (userIds.length) {
      const pointsRows = (await this.ds.query(
        `SELECT user_id AS "userId", balance
         FROM points_wallets
         WHERE tenant_id = $1 AND user_id = ANY($2::uuid[])`,
        [tenantId, userIds],
      )) as Array<{ userId: string; balance: number }>;
      for (const row of pointsRows) {
        pointsByUser.set(row.userId, Number(row.balance) || 0);
      }
    }

    const result: Array<{
      userId: string;
      username: string | null;
      colors: Record<string, number>;
      online: boolean;
      pointsBalance: number;
      wallet: ReturnType<WalletService['toPublic']>;
    }> = [];
    for (const row of byUser.values()) {
      const wallet = await this.walletService.getByUser(tenantId, row.userId);
      result.push({
        userId: row.userId,
        colors: row.colors,
        online: row.online,
        username: names.get(row.userId) ?? null,
        pointsBalance: pointsByUser.get(row.userId) ?? 0,
        wallet,
      });
    }
    result.sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1;
      return (a.username ?? a.userId).localeCompare(
        b.username ?? b.userId,
        'es',
      );
    });
    return result;
  }

  private async usernamesByIds(tenantId: string, userIds: string[]) {
    const unique = [...new Set(userIds.filter(Boolean))];
    const map = new Map<string, string>();
    if (!unique.length) return map;
    const users = await this.ds.getRepository(User).find({
      where: { tenantId, id: In(unique) },
      select: ['id', 'username'],
    });
    for (const u of users) map.set(u.id, u.username);
    return map;
  }
}
