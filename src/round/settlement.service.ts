import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { Round } from './entities/round.entity';
import { Purchase } from 'src/purchase/entities/purchase.entity';
import { RoundHistorySnapshot } from 'src/history/entities/round-history-snapshot.entity';
import {
  LudoColor,
  PointsMovementType,
  PurchaseStatus,
  RoundStatus,
  WalletMovementType,
} from 'src/common/enums';
import { WalletService } from 'src/wallet/wallet.service';
import { PointsService } from 'src/points/points.service';
import { RealtimeEmitterService } from 'src/realtime/realtime-emitter.service';
import { AuditService } from 'src/audit/audit.service';
import { Promo } from 'src/promo/entities/promo.entity';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class SettlementService {
  constructor(
    private readonly ds: DataSource,
    private readonly walletService: WalletService,
    private readonly pointsService: PointsService,
    private readonly realtime: RealtimeEmitterService,
    private readonly audit: AuditService,
  ) {}

  async settle(
    tenantId: string,
    roundId: string,
    winnerColor: LudoColor,
    authorId: string,
  ) {
    const result = await this.ds.transaction(async (manager) => {
      const roundRepo = manager.getRepository(Round);
      const round = await roundRepo.findOne({
        where: { id: roundId, tenantId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!round) throw new NotFoundException('Ronda no encontrada');

      if (round.status === RoundStatus.FINISHED || round.settledAt) {
        throw new ConflictException(
          'La ronda ya fue liquidada; no se pueden duplicar premios',
        );
      }
      if (round.status !== RoundStatus.PURCHASES_CLOSED) {
        throw new BadRequestException(
          'La ronda debe estar en PURCHASES_CLOSED para finalizar',
        );
      }

      const purchases = await manager.getRepository(Purchase).find({
        where: { roundId, tenantId, status: PurchaseStatus.ACTIVE },
      });
      const promos = await manager.getRepository(Promo).find({
        where: { roundId, tenantId },
      });

      type ParticipantPurchase = {
        purchaseId: string;
        color: string;
        quantity: number;
        multiplier: number;
        unitPriceCents: number;
        promoId?: string | null;
      };
      type ParticipantRow = {
        userId: string;
        username: string | null;
        purchases: ParticipantPurchase[];
        spentCents: number;
        prizeCents: number;
        points: number;
        balanceBefore: number | null;
        balanceAfter: number | null;
      };
      const participantMap = new Map<string, ParticipantRow>();

      for (const p of purchases) {
        if (!participantMap.has(p.userId)) {
          participantMap.set(p.userId, {
            userId: p.userId,
            username: null,
            purchases: [],
            spentCents: 0,
            prizeCents: 0,
            points: 0,
            balanceBefore: null,
            balanceAfter: null,
          });
        }
        const row = participantMap.get(p.userId)!;
        const spent = p.quantity * p.unitPriceCents;
        row.spentCents += spent;
        row.purchases.push({
          purchaseId: p.id,
          color: p.color,
          quantity: p.quantity,
          multiplier: p.multiplier,
          unitPriceCents: p.unitPriceCents,
          promoId: p.promoId,
        });
      }

      // Premios al color ganador
      for (const p of purchases) {
        if (p.color !== winnerColor) continue;
        const prize = p.quantity * round.prizeCents;
        const { wallet } = await this.walletService.applyDelta(manager, {
          tenantId,
          userId: p.userId,
          type: WalletMovementType.PRIZE,
          amountCents: prize,
          authorId,
          roundId,
          purchaseId: p.id,
          note: `Premio ${winnerColor} x${p.quantity}`,
        });
        const row = participantMap.get(p.userId)!;
        row.prizeCents += prize;
        if (row.balanceBefore === null) {
          row.balanceBefore = wallet.balanceCents - prize;
        }
        row.balanceAfter = wallet.balanceCents;
      }

      // Puntos por todas las compras ACTIVE
      for (const p of purchases) {
        const pts = p.quantity * p.multiplier;
        await this.pointsService.applyDelta(manager, {
          tenantId,
          userId: p.userId,
          type: PointsMovementType.EARNED,
          amount: pts,
          authorId,
          roundId,
          purchaseId: p.id,
          note: `Puntos ronda ${round.number}`,
        });
        const row = participantMap.get(p.userId)!;
        row.points += pts;
      }

      // Completar saldos antes/después para quien no ganó
      for (const row of participantMap.values()) {
        if (row.balanceAfter === null) {
          const wallet = await this.walletService.ensureWallet(
            tenantId,
            row.userId,
            manager,
          );
          row.balanceBefore = wallet.balanceCents;
          row.balanceAfter = wallet.balanceCents;
        }
      }

      const userIds = [...participantMap.keys()];
      if (userIds.length) {
        const users = await manager.getRepository(User).find({
          where: { id: In(userIds) },
          select: ['id', 'username'],
        });
        for (const u of users) {
          const row = participantMap.get(u.id);
          if (row) row.username = u.username;
        }
      }

      const finishedAt = new Date();
      round.status = RoundStatus.FINISHED;
      round.winnerColor = winnerColor;
      round.finishedAt = finishedAt;
      round.settledAt = finishedAt;
      round.updatedBy = authorId;
      await roundRepo.save(round);

      const payload = {
        config: {
          priceCents: round.priceCents,
          prizeCents: round.prizeCents,
          slotsPerColor: round.slotsPerColor,
        },
        promos: promos.map((pr) => ({
          id: pr.id,
          color: pr.color,
          slots: pr.slots,
          sold: pr.sold,
          multiplier: pr.multiplier,
          active: pr.active,
        })),
        winnerColor,
        participants: [...participantMap.values()],
      };

      await manager.getRepository(RoundHistorySnapshot).save(
        manager.getRepository(RoundHistorySnapshot).create({
          tenantId,
          roundId,
          liveId: round.liveId,
          winnerColor,
          finishedAt,
          payload,
          createdBy: authorId,
        }),
      );

      await this.audit.write(
        {
          tenantId,
          actorId: authorId,
          action: 'round.finish',
          entityType: 'round',
          entityId: roundId,
          afterData: { winnerColor, participants: participantMap.size },
        },
        manager,
      );

      return { round, payload };
    });

    this.realtime.emitToLive(tenantId, result.round.liveId, 'round:finished', {
      roundId,
      winnerColor,
      prizeCents: result.round.prizeCents,
    });

    for (const p of result.payload.participants) {
      const wonQty = p.purchases
        .filter((x) => x.color === winnerColor)
        .reduce((acc, x) => acc + x.quantity, 0);
      const boughtQty = p.purchases.reduce(
        (acc, x) => acc + Number(x.quantity),
        0,
      );
      const promoQty = p.purchases
        .filter((x) => Number(x.multiplier) > 1)
        .reduce((acc, x) => acc + Number(x.quantity), 0);
      const pointsWallet = await this.pointsService.ensure(tenantId, p.userId);
      this.realtime.emitToUser(tenantId, p.userId, 'round:result', {
        roundId,
        winnerColor,
        iWon: wonQty > 0,
        wonQty,
        boughtQty,
        promoQty,
        prizeCents: p.prizeCents,
        pointsEarned: p.points,
        balanceCents: p.balanceAfter,
        pointsBalance: pointsWallet.balance,
      });
      this.realtime.emitToUser(tenantId, p.userId, 'wallet:updated', {
        roundId,
        balanceCents: p.balanceAfter ?? undefined,
        pointsBalance: pointsWallet.balance,
      });
    }

    return result;
  }
}
