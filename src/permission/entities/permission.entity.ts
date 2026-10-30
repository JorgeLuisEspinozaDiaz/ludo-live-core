import { Column, Entity, JoinColumn, ManyToMany, ManyToOne } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Role } from 'src/role/entities/role.entity';
import { Section } from 'src/section/entities/section.entity';

@Entity('permissions')
export class Permission extends BaseEntity {
  @Column({ unique: true })
  code: string;

  @Column({ nullable: true })
  endpoint?: string;

  @Column()
  description: string;

  @ManyToOne(() => Section, (section) => section.permissions, { nullable: true, eager: true })
  @JoinColumn({ name: 'section_id' })
  section?: Section | null;

  @Column({ name: 'section_id', type: 'uuid', nullable: true })
  sectionId?: string | null;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];
}
