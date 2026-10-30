import { Column, Entity, JoinColumn, ManyToOne, OneToMany, Unique } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Menu } from 'src/menu/entities/menu.entity';
import { Permission } from 'src/permission/entities/permission.entity';

@Entity('sections')
@Unique(['name', 'menuId'])
export class Section extends BaseEntity {
  @Column()
  name: string;

  @ManyToOne(() => Menu, (menu) => menu.sections, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menu_id' })
  menu: Menu;

  @Column({ name: 'menu_id', type: 'uuid' })
  menuId: string;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @OneToMany(() => Permission, (permission) => permission.section)
  permissions: Permission[];
}
