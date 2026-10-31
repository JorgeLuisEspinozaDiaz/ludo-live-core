import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { TenantScopedEntity } from 'src/common/entities/base.entity';
import { Tenant } from 'src/tenant/entities/tenant.entity';
import { User } from 'src/user/entities/user.entity';
import { Live } from './live.entity';

@Entity('live_participants')
@Unique(['liveId', 'userId'])
export class LiveParticipant extends TenantScopedEntity {
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'live_id', type: 'uuid' })
  liveId: string;

  @ManyToOne(() => Live, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'live_id' })
  live: Live;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'connected_at', type: 'timestamptz', default: () => 'NOW()' })
  connectedAt: Date;

  @Column({ name: 'disconnected_at', type: 'timestamptz', nullable: true })
  disconnectedAt?: Date | null;
}
