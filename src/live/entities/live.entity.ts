import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TenantScopedEntity } from 'src/common/entities/base.entity';
import { Tenant } from 'src/tenant/entities/tenant.entity';
import { LiveStatus } from 'src/common/enums';

@Entity('lives')
export class Live extends TenantScopedEntity {
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({
    type: 'enum',
    enum: LiveStatus,
    enumName: 'lives_status_enum',
    default: LiveStatus.SCHEDULED,
  })
  status: LiveStatus;

  @Column({ name: 'room_name', type: 'varchar', length: 120, nullable: true })
  roomName?: string | null;

  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt?: Date | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt?: Date | null;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt?: Date | null;
}
