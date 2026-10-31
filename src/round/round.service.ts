import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Round } from './entities/round.entity';
import { RoundColorStock } from './entities/round-color-stock.entity';
import {
  LUDO_COLORS,
  LudoColor,
  RoundStatus,
} from 'src/common/enums';
import { GameConfigService } from 'src/game-config/game-config.service';
import { LiveService } from 'src/live/live.service';
import {
  CancelRoundDto,
  CreateRoundDto,
  FinishRoundDto,
  UpdateRoundDto,
} from './dto/round.dto';
import { RealtimeEmitterService } from 'src/realtime/realtime-emitter.service';
import { SettlementService } from './settlement.service';
import { AuditService } from 'src/audit/audit.service';

const ACTIVE_STATUSES = [
  RoundStatus.CREATED,
  RoundStatus.PURCHASES_OPEN,
  RoundStatus.PURCHASES_CLOSED,
];

@Injectable()
export class RoundService {
  constructor(
    @InjectRepository(Round)
    private readonly rounds: Repository<Round>,
    @InjectRepository(RoundColorStock)
    private readonly stocks: Repository<RoundColorStock>,
    private readonly ds: DataSource,
    private readonly gameConfig: GameConfigService,
    private readonly lives: LiveService,
    private readonly settlement: SettlementService,
    private readonly realtime: RealtimeEmitterService,
    private readonly audit: AuditService,
  ) {}

  async create(
    tenantId: string,
    liveId: string,
    dto: CreateRoundDto,
    userId: string,
  ) {
    await this.lives.findOne(tenantId, liveId);
    const config = await this.gameConfig.getOrCreate(tenantId);

    const active = await this.rounds
      .createQueryBuilder('r')
      .where('r.live_id = :liveId AND r.status IN (:...statuses)', {
        liveId,
        statuses: ACTIVE_STATUSES,
      })
      .getOne();
    if (active) {
      throw new ConflictException(
        'Ya existe una ronda activa en esta transmisión',
      );
    }

    const last = await this.rounds.findOne({
      where: { liveId, tenantId },
      order: { number: 'DESC' },
    });

    return this.ds.transaction(async (manager) => {
      const round = await manager.getRepository(Round).save(
        manager.getRepository(Round).create({
          tenantId,
          liveId,
          number: (last?.number ?? 0) + 1,
          status: RoundStatus.CREATED,
          priceCents: dto.priceCents ?? config.priceCents,
          prizeCents: dto.prizeCents ?? config.prizeCents,
          slotsPerColor: dto.slotsPerColor ?? config.slotsPerColor,
          createdBy: userId,
        }),
      );

      for (const color of LUDO_COLORS) {
        await manager.getRepository(RoundColorStock).save(
          manager.getRepository(RoundColorStock).create({
            tenantId,
            roundId: round.id,
            color,
            capacity: round.slotsPerColor,
            sold: 0,
          }),
        );
      }

      this.realtime.emitToLive(tenantId, liveId, 'round:created', {
        roundId: round.id,
        liveId,
      });
      await this.audit.write(
        {
          tenantId,
          actorId: userId,
          action: 'round.create',
          entityType: 'round',
          entityId: round.id,
          afterData: {
            priceCents: round.priceCents,
            prizeCents: round.prizeCents,
            slotsPerColor: round.slotsPerColor,
          },
        },
        manager,
      );
      return round;
    });
  }

  async findOne(tenantId: string, id: string) {
    const round = await this.rounds.findOne({ where: { id, tenantId } });
    if (!round) throw new NotFoundException('Ronda no encontrada');
    return round;
  }

  async listByLive(tenantId: string, liveId: string) {
    return this.rounds.find({
      where: { tenantId, liveId },
      order: { number: 'ASC' },
    });
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateRoundDto,
    userId: string,
  ) {
    const round = await this.findOne(tenantId, id);
    if (round.status !== RoundStatus.CREATED) {
      throw new BadRequestException(
        'Solo se puede editar la config antes de abrir compras',
      );
    }
    if (dto.priceCents !== undefined) round.priceCents = dto.priceCents;
    if (dto.prizeCents !== undefined) round.prizeCents = dto.prizeCents;
    if (dto.slotsPerColor !== undefined) {
      round.slotsPerColor = dto.slotsPerColor;
      await this.stocks.update(
        { roundId: round.id },
        { capacity: dto.slotsPerColor },
      );
    }
    round.updatedBy = userId;
    return this.rounds.save(round);
  }

  async openPurchases(tenantId: string, id: string, userId: string) {
    const round = await this.findOne(tenantId, id);
    // Se puede abrir desde CREATED o reabrir desde PURCHASES_CLOSED las veces que haga falta
    if (
      round.status !== RoundStatus.CREATED &&
      round.status !== RoundStatus.PURCHASES_CLOSED
    ) {
      throw new BadRequestException(
        'Solo se pueden abrir compras en CREATED o PURCHASES_CLOSED',
      );
    }
    round.status = RoundStatus.PURCHASES_OPEN;
    round.purchasesOpenedAt = round.purchasesOpenedAt ?? new Date();
    round.purchasesClosedAt = null;
    round.updatedBy = userId;
    await this.rounds.save(round);
    this.realtime.emitToLive(tenantId, round.liveId, 'round:purchases_opened', {
      roundId: id,
    });
    return round;
  }

  async closePurchases(tenantId: string, id: string, userId: string) {
    const round = await this.findOne(tenantId, id);
    if (round.status !== RoundStatus.PURCHASES_OPEN) {
      throw new BadRequestException('La ronda debe estar en PURCHASES_OPEN');
    }
    round.status = RoundStatus.PURCHASES_CLOSED;
    round.purchasesClosedAt = new Date();
    round.updatedBy = userId;
    await this.rounds.save(round);
    this.realtime.emitToLive(tenantId, round.liveId, 'round:purchases_closed', {
      roundId: id,
    });
    return round;
  }

  async finish(
    tenantId: string,
    id: string,
    dto: FinishRoundDto,
    userId: string,
  ) {
    return this.settlement.settle(tenantId, id, dto.winnerColor, userId);
  }

  async cancel(
    tenantId: string,
    id: string,
    dto: CancelRoundDto,
    userId: string,
  ) {
    const round = await this.findOne(tenantId, id);
    if (
      round.status === RoundStatus.FINISHED ||
      round.status === RoundStatus.CANCELLED
    ) {
      throw new BadRequestException('La ronda ya está cerrada');
    }
    round.status = RoundStatus.CANCELLED;
    round.cancelledAt = new Date();
    round.cancelReason = dto.reason;
    round.updatedBy = userId;
    await this.rounds.save(round);
    await this.audit.write({
      tenantId,
      actorId: userId,
      action: 'round.cancel',
      entityType: 'round',
      entityId: id,
      reason: dto.reason,
    });
    return round;
  }

  async inventory(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.stocks.find({
      where: { tenantId, roundId: id },
      order: { color: 'ASC' },
    });
  }

  assertTransition(from: RoundStatus, to: RoundStatus) {
    const allowed: Record<RoundStatus, RoundStatus[]> = {
      [RoundStatus.CREATED]: [
        RoundStatus.PURCHASES_OPEN,
        RoundStatus.CANCELLED,
      ],
      [RoundStatus.PURCHASES_OPEN]: [
        RoundStatus.PURCHASES_CLOSED,
        RoundStatus.CANCELLED,
      ],
      [RoundStatus.PURCHASES_CLOSED]: [
        RoundStatus.PURCHASES_OPEN,
        RoundStatus.FINISHED,
        RoundStatus.CANCELLED,
      ],
      [RoundStatus.FINISHED]: [],
      [RoundStatus.CANCELLED]: [],
    };
    if (!allowed[from].includes(to)) {
      throw new BadRequestException(
        `Transición inválida: ${from} → ${to}`,
      );
    }
  }
}
