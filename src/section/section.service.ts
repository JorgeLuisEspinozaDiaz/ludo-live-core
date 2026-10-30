import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Section } from './entities/section.entity';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { listOrPaginate } from 'src/common/utils/pagination.helper';

@Injectable()
export class SectionService {
  constructor(
    @InjectRepository(Section)
    private readonly sectionRepository: Repository<Section>,
  ) {}

  async create(dto: CreateSectionDto) {
    const section = this.sectionRepository.create(dto);
    return this.sectionRepository.save(section);
  }

  async findAll(query: PaginationQueryDto) {
    const qb = this.sectionRepository
      .createQueryBuilder('section')
      .leftJoinAndSelect('section.menu', 'menu');

    if (query.search) {
      qb.andWhere('section.name ILIKE :search', {
        search: `%${query.search}%`,
      });
    }

    qb.orderBy('section.sortOrder', 'ASC').addOrderBy('section.name', 'ASC');

    return listOrPaginate(qb, query);
  }

  async findOne(id: string) {
    const section = await this.sectionRepository.findOne({
      where: { id },
      relations: ['menu', 'permissions'],
    });
    if (!section) {
      throw new NotFoundException('Sección no encontrada');
    }
    return section;
  }

  async update(id: string, dto: UpdateSectionDto) {
    const section = await this.findOne(id);
    Object.assign(section, dto);
    return this.sectionRepository.save(section);
  }

  async remove(id: string) {
    const section = await this.findOne(id);
    await this.sectionRepository.remove(section);
    return { message: 'Sección eliminada correctamente' };
  }
}
