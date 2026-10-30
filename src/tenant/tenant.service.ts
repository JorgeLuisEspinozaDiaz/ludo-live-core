import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { TenantConfig } from './entities/tenant-config.entity';
import { UpdateTenantConfigDto } from './dto/update-tenant-config.dto';

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(TenantConfig)
    private readonly configRepository: Repository<TenantConfig>,
  ) {}

  async findOne(tenantId: string) {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }
    return tenant;
  }

  async getConfig(tenantId: string) {
    let config = await this.configRepository.findOne({
      where: { tenantId },
    });

    if (!config) {
      config = this.configRepository.create({ tenantId });
      config = await this.configRepository.save(config);
    }

    return config;
  }

  async updateConfig(tenantId: string, dto: UpdateTenantConfigDto) {
    const config = await this.getConfig(tenantId);
    Object.assign(config, dto);
    return this.configRepository.save(config);
  }
}
