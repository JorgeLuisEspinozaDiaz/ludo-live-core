import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Section } from 'src/section/entities/section.entity';

@Entity('menus')
export class Menu extends BaseEntity {
  @Column()
  name: string;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @OneToMany(() => Section, (section) => section.menu)
  sections: Section[];
}
