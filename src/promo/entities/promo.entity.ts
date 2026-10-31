import { Check, Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TenantScopedEntity } from 'src/common/entities/base.entity';
import { Tenant } from 'src/tenant/entities/tenant.entity';
import { Round } from 'src/round/entities/round.entity';
import { LudoColor } from 'src/common/enums';

@Entity('promos')
@Check(`"sold" >= 0 AND "sold" <= "slots"`)
@Check(`"multiplier" >= 1`)
export class Promo extends TenantScopedEntity {
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'round_id', type: 'uuid' })
  roundId: string;

  @ManyToOne(() => Round, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'round_id' })
  round: Round;

  @Column({ type: 'enum', enum: LudoColor, enumName: 'ludo_color_enum' })
  color: LudoColor;

  @Column({ type: 'int' })
  slots: number;

  @Column({ type: 'int', default: 0 })
  sold: number;

  @Column({ type: 'int', default: 2 })
  multiplier: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}
