import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { GameConfig } from './entities/game-config.entity';
import { UpdateGameConfigDto } from './dto/update-game-config.dto';

@Injectable()
export class GameConfigService {
  constructor(
    @InjectRepository(GameConfig)
    private readonly repo: Repository<GameConfig>,
  ) {}

  async getOrCreate(tenantId: string, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(GameConfig) : this.repo;
    let config = await repo.findOne({ where: { tenantId } });
    if (!config) {
      config = await repo.save(
        repo.create({
          tenantId,
          priceCents: 200,
          prizeCents: 1000,
          slotsPerColor: 50,
          pointsPerSol: 10,
          centsPerRedeemUnit: 100,
          minRedeemPoints: 10,
          redeemPointsMultiple: 10,
        }),
      );
    }
    return config;
  }

  async update(tenantId: string, dto: UpdateGameConfigDto, updatedBy?: string) {
    const config = await this.getOrCreate(tenantId);
    Object.assign(config, dto);
    config.updatedBy = updatedBy ?? null;
    return this.repo.save(config);
  }
}
