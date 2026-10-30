import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Menu } from './entities/menu.entity';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { listOrPaginate } from 'src/common/utils/pagination.helper';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Menu)
    private readonly menuRepository: Repository<Menu>,
  ) {}

  async create(dto: CreateMenuDto) {
    const menu = this.menuRepository.create(dto);
    return this.menuRepository.save(menu);
  }

  async findAll(query: PaginationQueryDto) {
    const qb = this.menuRepository
      .createQueryBuilder('menu')
      .leftJoinAndSelect('menu.sections', 'sections');

    if (query.search) {
      qb.andWhere('menu.name ILIKE :search', {
        search: `%${query.search}%`,
      });
    }

    qb.orderBy('menu.sortOrder', 'ASC').addOrderBy('menu.name', 'ASC');

    return listOrPaginate(qb, query);
  }

  async findOne(id: string) {
    const menu = await this.menuRepository.findOne({
      where: { id },
      relations: ['sections'],
    });
    if (!menu) {
      throw new NotFoundException('Menú no encontrado');
    }
    return menu;
  }

  async update(id: string, dto: UpdateMenuDto) {
    const menu = await this.findOne(id);
    Object.assign(menu, dto);
    return this.menuRepository.save(menu);
  }

  async remove(id: string) {
    const menu = await this.findOne(id);
    await this.menuRepository.remove(menu);
    return { message: 'Menú eliminado correctamente' };
  }
}
