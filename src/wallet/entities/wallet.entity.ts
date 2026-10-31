import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { TenantScopedEntity } from 'src/common/entities/base.entity';
import { Tenant } from 'src/tenant/entities/tenant.entity';
import { User } from 'src/user/entities/user.entity';
import { centsTransformer } from 'src/common/money/cents.transformer';

@Entity('wallets')
@Unique(['userId'])
export class Wallet extends TenantScopedEntity {
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    name: 'balance_cents',
    type: 'bigint',
    transformer: centsTransformer,
    default: 0,
  })
  balanceCents: number;
}
