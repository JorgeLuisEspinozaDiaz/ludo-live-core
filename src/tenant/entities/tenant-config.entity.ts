import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { TenantScopedEntity } from 'src/common/entities/base.entity';

@Entity('tenant_configs')
export class TenantConfig extends TenantScopedEntity {
  @Column({ default: 'PEN' })
  currency: string;

  @Column({ name: 'igv_rate', type: 'decimal', precision: 5, scale: 2, default: 18 })
  igvRate: number;

  @Column({ name: 'trade_name', nullable: true })
  tradeName?: string;

  @Column({ name: 'logo_url', nullable: true })
  logoUrl?: string;

  @Column({ name: 'ticket_series', default: 'T001' })
  ticketSeries: string;

  @Column({ name: 'boleta_series', default: 'B001' })
  boletaSeries: string;

  @Column({ name: 'factura_series', default: 'F001' })
  facturaSeries: string;
}
