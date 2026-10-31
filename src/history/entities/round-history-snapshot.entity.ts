import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { TenantScopedEntity } from 'src/common/entities/base.entity';
import { Tenant } from 'src/tenant/entities/tenant.entity';
import { Round } from 'src/round/entities/round.entity';
import { Live } from 'src/live/entities/live.entity';
import { LudoColor } from 'src/common/enums';

@Entity('round_history_snapshots')
@Unique(['roundId'])
export class RoundHistorySnapshot extends TenantScopedEntity {
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'round_id', type: 'uuid' })
  roundId: string;

  @ManyToOne(() => Round, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'round_id' })
  round: Round;

  @Column({ name: 'live_id', type: 'uuid' })
  liveId: string;

  @ManyToOne(() => Live, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'live_id' })
  live: Live;

  @Column({
    name: 'winner_color',
    type: 'enum',
    enum: LudoColor,
    enumName: 'ludo_color_enum',
  })
  winnerColor: LudoColor;

  @Column({ name: 'finished_at', type: 'timestamptz' })
  finishedAt: Date;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;
}
