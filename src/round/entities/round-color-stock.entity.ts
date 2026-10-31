import { Check, Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { TenantScopedEntity } from 'src/common/entities/base.entity';
import { Tenant } from 'src/tenant/entities/tenant.entity';
import { Round } from './round.entity';
import { LudoColor } from 'src/common/enums';

@Entity('round_color_stocks')
@Unique(['roundId', 'color'])
@Check(`"sold" >= 0 AND "sold" <= "capacity"`)
export class RoundColorStock extends TenantScopedEntity {
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
  capacity: number;

  @Column({ type: 'int', default: 0 })
  sold: number;
}
