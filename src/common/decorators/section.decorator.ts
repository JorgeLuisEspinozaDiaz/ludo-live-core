import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Section } from 'src/section/entities/section.entity';
import { Menu } from 'src/menu/entities/menu.entity';

export const SECTION_KEY = 'section_metadata';
export const SectionDecorator = (sectionName: string): MethodDecorator => {
  return (target, key, descriptor) => {
    if (descriptor && descriptor.value) {
      Reflect.defineMetadata(SECTION_KEY, sectionName, descriptor.value);
    }
    return descriptor;
  };
};

/**
 * Helper de secciones para el seeder (repos se bindean por BD tenant).
 */
@Injectable()
export class SectionInterceptor {
  private registeredSections = new Set<string>();
  private sectionRepository!: Repository<Section>;
  private menuRepository!: Repository<Menu>;

  bindRepositories(
    sectionRepository: Repository<Section>,
    menuRepository: Repository<Menu>,
  ) {
    this.sectionRepository = sectionRepository;
    this.menuRepository = menuRepository;
    this.registeredSections.clear();
  }

  async ensureSection(name: string, menuId: string): Promise<Section | null> {
    const key = `${name}-${menuId}`;

    if (this.registeredSections.has(key)) {
      return this.sectionRepository.findOne({
        where: { name, menuId },
        relations: ['menu'],
      });
    }

    const menu = await this.menuRepository.findOne({ where: { id: menuId } });
    if (!menu) {
      console.log(`Menú no encontrado: ${menuId}`);
      return null;
    }

    let section = await this.sectionRepository.findOne({
      where: { name, menuId },
      relations: ['menu'],
    });

    if (!section) {
      try {
        section = this.sectionRepository.create({ name, menu, menuId });
        section = await this.sectionRepository.save(section);
        this.registeredSections.add(key);
        console.log(`Sección creada: ${name} (${menu.name})`);
      } catch (error) {
        section = await this.sectionRepository.findOne({
          where: { name, menuId },
          relations: ['menu'],
        });
        if (section) this.registeredSections.add(key);
        else {
          console.error('Error creando sección:', error);
          return null;
        }
      }
    } else {
      this.registeredSections.add(key);
    }

    return section;
  }
}
