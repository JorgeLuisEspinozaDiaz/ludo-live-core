import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TenantScopedEntity } from 'src/common/entities/base.entity';
import { Tenant } from 'src/tenant/entities/tenant.entity';
import { User } from 'src/user/entities/user.entity';
import { Round } from 'src/round/entities/round.entity';
import { Promo } from 'src/promo/entities/promo.entity';
import { LudoColor, PurchaseStatus } from 'src/common/enums';
import { centsTransformer } from 'src/common/money/cents.transformer';

@Entity('purchases')
export class Purchase extends TenantScopedEntity {
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'round_id', type: 'uuid' })
  roundId: string;

  @ManyToOne(() => Round, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'round_id' })
  round: Round;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: LudoColor, enumName: 'ludo_color_enum' })
  color: LudoColor;

  @Column({ type: 'int' })
  quantity: number;

  @Column({
    name: 'unit_price_cents',
    type: 'bigint',
    transformer: centsTransformer,
  })
  unitPriceCents: number;

  @Column({ type: 'int', default: 1 })
  multiplier: number;

  @Column({ name: 'promo_id', type: 'uuid', nullable: true })
  promoId?: string | null;

  @ManyToOne(() => Promo, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'promo_id' })
  promo?: Promo | null;

  @Column({
    type: 'enum',
    enum: PurchaseStatus,
    enumName: 'purchases_status_enum',
    default: PurchaseStatus.ACTIVE,
  })
  status: PurchaseStatus;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason?: string | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt?: Date | null;

  @Column({ name: 'cancelled_by', type: 'uuid', nullable: true })
  cancelledBy?: string | null;
}
