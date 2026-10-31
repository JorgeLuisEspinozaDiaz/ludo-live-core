import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TenantScopedEntity } from 'src/common/entities/base.entity';
import { Tenant } from 'src/tenant/entities/tenant.entity';

@Entity('audit_logs')
export class AuditLog extends TenantScopedEntity {
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId?: string | null;

  @Column({ type: 'varchar', length: 80 })
  action: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 80 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId?: string | null;

  @Column({ name: 'before_data', type: 'jsonb', nullable: true })
  beforeData?: Record<string, unknown> | null;

  @Column({ name: 'after_data', type: 'jsonb', nullable: true })
  afterData?: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip?: string | null;
}
