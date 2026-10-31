import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promo } from './entities/promo.entity';
import { Round } from 'src/round/entities/round.entity';
import { RoundColorStock } from 'src/round/entities/round-color-stock.entity';
import { RoundStatus } from 'src/common/enums';
import { CreatePromoDto, UpdatePromoDto } from './dto/promo.dto';
import { RealtimeEmitterService } from 'src/realtime/realtime-emitter.service';

@Injectable()
export class PromoService {
  constructor(
    @InjectRepository(Promo)
    private readonly promos: Repository<Promo>,
    @InjectRepository(Round)
    private readonly rounds: Repository<Round>,
    @InjectRepository(RoundColorStock)
    private readonly stocks: Repository<RoundColorStock>,
    private readonly realtime: RealtimeEmitterService,
  ) {}

  async create(
    tenantId: string,
    roundId: string,
    dto: CreatePromoDto,
    userId: string,
  ) {
    const round = await this.rounds.findOne({ where: { id: roundId, tenantId } });
    if (!round) throw new NotFoundException('Ronda no encontrada');
    if (
      round.status !== RoundStatus.CREATED &&
      round.status !== RoundStatus.PURCHASES_OPEN
    ) {
      throw new BadRequestException(
        'Solo se pueden crear promos antes o durante compras abiertas',
      );
    }
    const stock = await this.stocks.findOne({
      where: { roundId, color: dto.color },
    });
    if (!stock) throw new NotFoundException('Stock del color no encontrado');
    const remaining = stock.capacity - stock.sold;
    if (dto.slots > remaining) {
      throw new UnprocessableEntityException(
        `Cupo promo (${dto.slots}) supera casillas restantes (${remaining})`,
      );
    }

    const promo = await this.promos.save(
      this.promos.create({
        tenantId,
        roundId,
        color: dto.color,
        slots: dto.slots,
        multiplier: dto.multiplier,
        sold: 0,
        active: true,
        createdBy: userId,
      }),
    );
    this.realtime.emitToLive(tenantId, round.liveId, 'promo:activated', {
      promoId: promo.id,
      roundId,
      color: promo.color,
      multiplier: promo.multiplier,
    });
    return promo;
  }

  list(tenantId: string, roundId: string) {
    return this.promos.find({
      where: { tenantId, roundId },
      order: { createdAt: 'DESC' },
    });
  }

  async update(
    tenantId: string,
    promoId: string,
    dto: UpdatePromoDto,
    userId: string,
  ) {
    const promo = await this.promos.findOne({ where: { id: promoId, tenantId } });
    if (!promo) throw new NotFoundException('Promo no encontrada');
    if (dto.active !== undefined) promo.active = dto.active;
    promo.updatedBy = userId;
    await this.promos.save(promo);
    const round = await this.rounds.findOneByOrFail({ id: promo.roundId });
    this.realtime.emitToLive(
      tenantId,
      round.liveId,
      dto.active === false ? 'promo:deactivated' : 'promo:activated',
      { promoId: promo.id, roundId: promo.roundId },
    );
    return promo;
  }
}
