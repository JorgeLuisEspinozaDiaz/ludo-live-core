import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { listOrPaginate } from 'src/common/utils/pagination.helper';

export type AuditWriteInput = {
  tenantId: string;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  reason?: string | null;
  ip?: string | null;
};

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async write(input: AuditWriteInput, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(AuditLog) : this.repo;
    return repo.save(repo.create(input));
  }

  async findAll(tenantId: string, query: PaginationQueryDto) {
    const qb = this.repo
      .createQueryBuilder('a')
      .where('a.tenant_id = :tenantId', { tenantId })
      .orderBy('a.createdAt', 'DESC');
    if (query.search) {
      qb.andWhere('(a.action ILIKE :s OR a.entity_type ILIKE :s)', {
        s: `%${query.search}%`,
      });
    }
    return listOrPaginate(qb, query);
  }
}
