import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { PointsWallet } from './entities/points-wallet.entity';
import { PointsMovement } from './entities/points-movement.entity';
import { PointsMovementType, WalletMovementType } from 'src/common/enums';
import { GameConfigService } from 'src/game-config/game-config.service';
import { WalletService } from 'src/wallet/wallet.service';

@Injectable()
export class PointsService {
  constructor(
    @InjectRepository(PointsWallet)
    private readonly wallets: Repository<PointsWallet>,
    @InjectRepository(PointsMovement)
    private readonly movements: Repository<PointsMovement>,
    private readonly gameConfig: GameConfigService,
    private readonly walletService: WalletService,
  ) {}

  async ensure(tenantId: string, userId: string, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(PointsWallet) : this.wallets;
    let w = await repo.findOne({ where: { tenantId, userId } });
    if (!w) {
      w = await repo.save(repo.create({ tenantId, userId, balance: 0 }));
    }
    return w;
  }

  async applyDelta(
    manager: EntityManager,
    input: {
      tenantId: string;
      userId: string;
      type: PointsMovementType;
      amount: number;
      authorId?: string | null;
      roundId?: string | null;
      purchaseId?: string | null;
      note?: string | null;
    },
  ) {
    const repo = manager.getRepository(PointsWallet);
    let wallet = await repo.findOne({
      where: { tenantId: input.tenantId, userId: input.userId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!wallet) {
      wallet = await repo.save(
        repo.create({
          tenantId: input.tenantId,
          userId: input.userId,
          balance: 0,
        }),
      );
      wallet = await repo.findOne({
        where: { id: wallet.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet) throw new NotFoundException('Points wallet no creada');
    }

    const before = wallet.balance;
    const after = before + input.amount;
    if (after < 0) {
      throw new BadRequestException('Saldo de puntos insuficiente');
    }
    wallet.balance = after;
    await repo.save(wallet);

    const movement = await manager.getRepository(PointsMovement).save(
      manager.getRepository(PointsMovement).create({
        tenantId: input.tenantId,
        pointsWalletId: wallet.id,
        userId: input.userId,
        type: input.type,
        amount: input.amount,
        balanceBefore: before,
        balanceAfter: after,
        authorId: input.authorId ?? null,
        roundId: input.roundId ?? null,
        purchaseId: input.purchaseId ?? null,
        note: input.note ?? null,
        createdBy: input.authorId ?? null,
      }),
    );

    return { wallet, movement };
  }

  async getMine(tenantId: string, userId: string) {
    const w = await this.ensure(tenantId, userId);
    return { userId: w.userId, balance: w.balance };
  }

  async redeem(tenantId: string, userId: string, points: number) {
    const config = await this.gameConfig.getOrCreate(tenantId);
    if (points < config.minRedeemPoints) {
      throw new BadRequestException(
        `Mínimo de canje: ${config.minRedeemPoints} puntos`,
      );
    }
    if (points % config.redeemPointsMultiple !== 0) {
      throw new BadRequestException(
        `Los puntos deben ser múltiplo de ${config.redeemPointsMultiple}`,
      );
    }
    const units = Math.floor(points / config.pointsPerSol);
    const cents = units * config.centsPerRedeemUnit;

    return this.wallets.manager.transaction(async (manager) => {
      await this.applyDelta(manager, {
        tenantId,
        userId,
        type: PointsMovementType.REDEEMED,
        amount: -points,
        authorId: userId,
        note: `Canje ${points} pts → ${cents} céntimos`,
      });
      const walletResult = await this.walletService.applyDelta(manager, {
        tenantId,
        userId,
        type: WalletMovementType.POINTS_REDEMPTION,
        amountCents: cents,
        authorId: userId,
        note: `Canje de ${points} puntos`,
      });
      return {
        pointsRedeemed: points,
        creditedCents: cents,
        wallet: this.walletService.toPublic(walletResult.wallet),
      };
    });
  }

  async adjust(
    tenantId: string,
    userId: string,
    amount: number,
    reason: string,
    authorId: string,
  ) {
    if (!reason?.trim()) {
      throw new BadRequestException('Motivo obligatorio');
    }
    if (amount === 0) throw new BadRequestException('El ajuste no puede ser 0');
    return this.wallets.manager.transaction(async (manager) => {
      return this.applyDelta(manager, {
        tenantId,
        userId,
        type: PointsMovementType.ADJUSTMENT,
        amount,
        authorId,
        note: reason,
      });
    });
  }
}
