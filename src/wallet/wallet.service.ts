import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletMovement } from './entities/wallet-movement.entity';
import { WalletMovementType, WalletVisualStatus } from 'src/common/enums';
import { visualStatusFromBalance } from 'src/common/money/cents.transformer';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { listOrPaginate } from 'src/common/utils/pagination.helper';

export type ApplyWalletDeltaInput = {
  tenantId: string;
  userId: string;
  type: WalletMovementType;
  amountCents: number; // signed
  authorId?: string | null;
  roundId?: string | null;
  purchaseId?: string | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  note?: string | null;
};

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly wallets: Repository<Wallet>,
    @InjectRepository(WalletMovement)
    private readonly movements: Repository<WalletMovement>,
  ) {}

  async ensureWallet(tenantId: string, userId: string, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(Wallet) : this.wallets;
    let wallet = await repo.findOne({ where: { userId, tenantId } });
    if (!wallet) {
      wallet = await repo.save(
        repo.create({ tenantId, userId, balanceCents: 0 }),
      );
    }
    return wallet;
  }

  /**
   * Aplica un movimiento al ledger con bloqueo de fila. Debe ejecutarse dentro de una TX.
   */
  async applyDelta(manager: EntityManager, input: ApplyWalletDeltaInput) {
    const walletRepo = manager.getRepository(Wallet);
    let wallet = await walletRepo.findOne({
      where: { userId: input.userId, tenantId: input.tenantId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!wallet) {
      wallet = await walletRepo.save(
        walletRepo.create({
          tenantId: input.tenantId,
          userId: input.userId,
          balanceCents: 0,
        }),
      );
      wallet = await walletRepo.findOne({
        where: { id: wallet.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet) throw new NotFoundException('Wallet no creada');
    }

    const before = wallet.balanceCents;
    const after = before + input.amountCents;
    wallet.balanceCents = after;
    await walletRepo.save(wallet);

    const movement = await manager.getRepository(WalletMovement).save(
      manager.getRepository(WalletMovement).create({
        tenantId: input.tenantId,
        walletId: wallet.id,
        userId: input.userId,
        type: input.type,
        amountCents: input.amountCents,
        balanceBeforeCents: before,
        balanceAfterCents: after,
        authorId: input.authorId ?? null,
        roundId: input.roundId ?? null,
        purchaseId: input.purchaseId ?? null,
        paymentMethod: input.paymentMethod ?? null,
        paymentReference: input.paymentReference ?? null,
        note: input.note ?? null,
        createdBy: input.authorId ?? null,
      }),
    );

    return { wallet, movement, visualStatus: visualStatusFromBalance(after) };
  }

  toPublic(wallet: Wallet) {
    return {
      id: wallet.id,
      userId: wallet.userId,
      balanceCents: wallet.balanceCents,
      visualStatus: visualStatusFromBalance(wallet.balanceCents) as WalletVisualStatus,
    };
  }

  async getMine(tenantId: string, userId: string) {
    const wallet = await this.ensureWallet(tenantId, userId);
    return this.toPublic(wallet);
  }

  async getByUser(tenantId: string, userId: string) {
    const wallet = await this.ensureWallet(tenantId, userId);
    return this.toPublic(wallet);
  }

  async list(tenantId: string, query: PaginationQueryDto) {
    const qb = this.wallets
      .createQueryBuilder('w')
      .where('w.tenant_id = :tenantId', { tenantId })
      .orderBy('w.balanceCents', 'ASC');
    return listOrPaginate(qb, query);
  }

  async registerPayment(
    tenantId: string,
    userId: string,
    amountCents: number,
    authorId: string,
    opts?: { method?: string; reference?: string; note?: string },
  ) {
    if (amountCents <= 0) {
      throw new BadRequestException('El monto del pago debe ser positivo');
    }
    return this.wallets.manager.transaction(async (manager) => {
      return this.applyDelta(manager, {
        tenantId,
        userId,
        type: WalletMovementType.PAYMENT,
        amountCents,
        authorId,
        paymentMethod: opts?.method,
        paymentReference: opts?.reference,
        note: opts?.note,
      });
    });
  }

  async adjust(
    tenantId: string,
    userId: string,
    amountCents: number,
    reason: string,
    authorId: string,
  ) {
    if (!reason?.trim()) {
      throw new BadRequestException('El motivo del ajuste es obligatorio');
    }
    if (amountCents === 0) {
      throw new BadRequestException('El ajuste no puede ser 0');
    }
    return this.wallets.manager.transaction(async (manager) => {
      return this.applyDelta(manager, {
        tenantId,
        userId,
        type: WalletMovementType.ADJUSTMENT,
        amountCents,
        authorId,
        note: reason,
      });
    });
  }

  async listMovements(tenantId: string, userId: string, query: PaginationQueryDto) {
    const qb = this.movements
      .createQueryBuilder('m')
      .where('m.tenant_id = :tenantId AND m.user_id = :userId', {
        tenantId,
        userId,
      })
      .orderBy('m.createdAt', 'DESC');
    return listOrPaginate(qb, query);
  }
}
