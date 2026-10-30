import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { listOrPaginate } from 'src/common/utils/pagination.helper';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async create(dto: CreatePermissionDto) {
    const permission = this.permissionRepository.create(dto);
    return this.permissionRepository.save(permission);
  }

  async findAll(query: PaginationQueryDto) {
    const qb = this.permissionRepository
      .createQueryBuilder('permission')
      .leftJoinAndSelect('permission.section', 'section')
      .leftJoinAndSelect('section.menu', 'menu');

    if (query.search) {
      qb.andWhere(
        '(permission.code ILIKE :search OR permission.description ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy('menu.sortOrder', 'ASC')
      .addOrderBy('section.sortOrder', 'ASC')
      .addOrderBy('permission.code', 'ASC');

    return listOrPaginate(qb, query);
  }

  async findOne(id: string) {
    const permission = await this.permissionRepository.findOne({
      where: { id },
      relations: ['section'],
    });
    if (!permission) {
      throw new NotFoundException('Permiso no encontrado');
    }
    return permission;
  }

  async update(id: string, dto: UpdatePermissionDto) {
    const permission = await this.findOne(id);
    Object.assign(permission, dto);
    return this.permissionRepository.save(permission);
  }

  async remove(id: string) {
    const permission = await this.findOne(id);
    await this.permissionRepository.remove(permission);
    return { message: 'Permiso eliminado correctamente' };
  }
}
