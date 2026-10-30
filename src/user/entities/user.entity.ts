import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { TenantScopedEntity } from 'src/common/entities/base.entity';
import { EntityStatus } from 'src/common/enums';
import { Role } from 'src/role/entities/role.entity';
import { Tenant } from 'src/tenant/entities/tenant.entity';
import { Exclude } from 'class-transformer';

@Entity('users')
@Unique(['tenantId', 'username'])
@Unique(['tenantId', 'email'])
export class User extends TenantScopedEntity {
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column()
  username: string;

  @Column({ nullable: true })
  email?: string;

  @Exclude()
  @Column()
  password: string;

  @ManyToOne(() => Role, { eager: true })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ name: 'role_id', type: 'uuid' })
  roleId: string;

  @Column({ type: 'enum', enum: EntityStatus, default: EntityStatus.ACTIVE })
  status: EntityStatus;
}
