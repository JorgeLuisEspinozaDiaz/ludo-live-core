import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TenantScopedEntity } from 'src/common/entities/base.entity';
import { Tenant } from 'src/tenant/entities/tenant.entity';
import { User } from 'src/user/entities/user.entity';
import { PointsWallet } from './points-wallet.entity';
import { PointsMovementType } from 'src/common/enums';

@Entity('points_movements')
export class PointsMovement extends TenantScopedEntity {
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'points_wallet_id', type: 'uuid' })
  pointsWalletId: string;

  @ManyToOne(() => PointsWallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'points_wallet_id' })
  pointsWallet: PointsWallet;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: PointsMovementType,
    enumName: 'points_movement_type_enum',
  })
  type: PointsMovementType;

  /** Signed points (negative = redeem). */
  @Column({ type: 'int' })
  amount: number;

  @Column({ name: 'balance_before', type: 'int' })
  balanceBefore: number;

  @Column({ name: 'balance_after', type: 'int' })
  balanceAfter: number;

  @Column({ name: 'round_id', type: 'uuid', nullable: true })
  roundId?: string | null;

  @Column({ name: 'purchase_id', type: 'uuid', nullable: true })
  purchaseId?: string | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @Column({ name: 'author_id', type: 'uuid', nullable: true })
  authorId?: string | null;
}
