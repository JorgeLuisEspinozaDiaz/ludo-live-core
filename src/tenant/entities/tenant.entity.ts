import { Column, Entity } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { EntityStatus } from 'src/common/enums';

/**
 * En control plane: registro de empresas + metadata de su BD.
 * En BD tenant: fila espejo (mismo id) para satisfacer FKs de User/Role.
 */
@Entity('tenants')
export class Tenant extends BaseEntity {
  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', unique: true })
  slug: string;

  @Column({
    type: 'enum',
    enum: EntityStatus,
    enumName: 'entity_status_enum',
    default: EntityStatus.ACTIVE,
  })
  status: EntityStatus;

  /** Nombre de la base PostgreSQL del tenant (solo relevante en control). */
  @Column({ name: 'database_name', type: 'varchar', nullable: true })
  databaseName: string | null;

  @Column({ name: 'db_host', type: 'varchar', nullable: true })
  dbHost: string | null;

  @Column({ name: 'db_port', type: 'int', nullable: true })
  dbPort: number | null;

  @Column({ name: 'db_user', type: 'varchar', nullable: true })
  dbUser: string | null;

  /** Si null, se usan credenciales del .env del servidor. */
  @Column({ name: 'db_password', type: 'varchar', nullable: true, select: false })
  dbPassword: string | null;
}
