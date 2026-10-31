import { Column, Entity } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { EntityStatus } from 'src/common/enums';

/** Administrador de plataforma (control plane): gestiona todos los tenants. */
@Entity('platform_admins')
export class PlatformAdmin extends BaseEntity {
  @Column({ type: 'varchar', unique: true })
  username: string;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar' })
  password: string;

  @Column({
    type: 'enum',
    enum: EntityStatus,
    enumName: 'entity_status_enum',
    default: EntityStatus.ACTIVE,
  })
  status: EntityStatus;
}
