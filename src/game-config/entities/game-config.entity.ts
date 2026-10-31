import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { TenantScopedEntity } from 'src/common/entities/base.entity';
import { Tenant } from 'src/tenant/entities/tenant.entity';
import { centsTransformer } from 'src/common/money/cents.transformer';

@Entity('game_configs')
@Unique(['tenantId'])
export class GameConfig extends TenantScopedEntity {
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  /** Precio por casilla en céntimos (default S/ 2.00). */
  @Column({
    name: 'price_cents',
    type: 'bigint',
    transformer: centsTransformer,
    default: 200,
  })
  priceCents: number;

  /** Premio por casilla ganadora en céntimos (default S/ 10.00). */
  @Column({
    name: 'prize_cents',
    type: 'bigint',
    transformer: centsTransformer,
    default: 1000,
  })
  prizeCents: number;

  @Column({ name: 'slots_per_color', type: 'int', default: 50 })
  slotsPerColor: number;

  /** Puntos necesarios para canjear 1 unidad de soles (default 10 pts = S/ 1). */
  @Column({ name: 'points_per_sol', type: 'int', default: 10 })
  pointsPerSol: number;

  /** Monto en céntimos por cada `pointsPerSol` puntos canjeados (default 100 = S/ 1). */
  @Column({
    name: 'cents_per_redeem_unit',
    type: 'bigint',
    transformer: centsTransformer,
    default: 100,
  })
  centsPerRedeemUnit: number;

  @Column({ name: 'min_redeem_points', type: 'int', default: 10 })
  minRedeemPoints: number;

  @Column({ name: 'redeem_points_multiple', type: 'int', default: 10 })
  redeemPointsMultiple: number;
}
