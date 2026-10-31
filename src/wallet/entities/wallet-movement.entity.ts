import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TenantScopedEntity } from 'src/common/entities/base.entity';
import { Tenant } from 'src/tenant/entities/tenant.entity';
import { User } from 'src/user/entities/user.entity';
import { Wallet } from './wallet.entity';
import { WalletMovementType } from 'src/common/enums';
import { centsTransformer } from 'src/common/money/cents.transformer';

@Entity('wallet_movements')
export class WalletMovement extends TenantScopedEntity {
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'wallet_id', type: 'uuid' })
  walletId: string;

  @ManyToOne(() => Wallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: WalletMovementType,
    enumName: 'wallet_movement_type_enum',
  })
  type: WalletMovementType;

  /** Signed amount in cents (negative = debit). */
  @Column({
    name: 'amount_cents',
    type: 'bigint',
    transformer: centsTransformer,
  })
  amountCents: number;

  @Column({
    name: 'balance_before_cents',
    type: 'bigint',
    transformer: centsTransformer,
  })
  balanceBeforeCents: number;

  @Column({
    name: 'balance_after_cents',
    type: 'bigint',
    transformer: centsTransformer,
  })
  balanceAfterCents: number;

  @Column({ name: 'round_id', type: 'uuid', nullable: true })
  roundId?: string | null;

  @Column({ name: 'purchase_id', type: 'uuid', nullable: true })
  purchaseId?: string | null;

  @Column({ name: 'payment_method', type: 'varchar', length: 60, nullable: true })
  paymentMethod?: string | null;

  @Column({ name: 'payment_reference', type: 'varchar', length: 120, nullable: true })
  paymentReference?: string | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @Column({ name: 'author_id', type: 'uuid', nullable: true })
  authorId?: string | null;
}
