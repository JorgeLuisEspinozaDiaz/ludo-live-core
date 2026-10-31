import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TenantScopedEntity } from 'src/common/entities/base.entity';
import { Tenant } from 'src/tenant/entities/tenant.entity';
import { Live } from 'src/live/entities/live.entity';
import { LudoColor, RoundStatus } from 'src/common/enums';
import { centsTransformer } from 'src/common/money/cents.transformer';

@Entity('rounds')
export class Round extends TenantScopedEntity {
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'live_id', type: 'uuid' })
  liveId: string;

  @ManyToOne(() => Live, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'live_id' })
  live: Live;

  @Column({ type: 'int', default: 1 })
  number: number;

  @Column({
    type: 'enum',
    enum: RoundStatus,
    enumName: 'rounds_status_enum',
    default: RoundStatus.CREATED,
  })
  status: RoundStatus;

  @Column({
    name: 'price_cents',
    type: 'bigint',
    transformer: centsTransformer,
  })
  priceCents: number;

  @Column({
    name: 'prize_cents',
    type: 'bigint',
    transformer: centsTransformer,
  })
  prizeCents: number;

  @Column({ name: 'slots_per_color', type: 'int' })
  slotsPerColor: number;

  @Column({
    name: 'winner_color',
    type: 'enum',
    enum: LudoColor,
    enumName: 'ludo_color_enum',
    nullable: true,
  })
  winnerColor?: LudoColor | null;

  @Column({ name: 'purchases_opened_at', type: 'timestamptz', nullable: true })
  purchasesOpenedAt?: Date | null;

  @Column({ name: 'purchases_closed_at', type: 'timestamptz', nullable: true })
  purchasesClosedAt?: Date | null;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt?: Date | null;

  @Column({ name: 'settled_at', type: 'timestamptz', nullable: true })
  settledAt?: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt?: Date | null;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason?: string | null;
}
