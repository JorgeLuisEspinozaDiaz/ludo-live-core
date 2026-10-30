import { Column, Entity, JoinColumn, ManyToOne, ManyToMany, JoinTable, Unique } from 'typeorm';
import { TenantScopedEntity } from 'src/common/entities/base.entity';
import { Permission } from 'src/permission/entities/permission.entity';
import { Tenant } from 'src/tenant/entities/tenant.entity';

@Entity('roles')
@Unique(['tenantId', 'name'])
export class Role extends TenantScopedEntity {
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @ManyToMany(() => Permission, (permission) => permission.roles, { eager: true })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id' },
    inverseJoinColumn: { name: 'permission_id' },
  })
  permissions: Permission[];
}
