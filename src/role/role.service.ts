import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from 'src/permission/entities/permission.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { listOrPaginate } from 'src/common/utils/pagination.helper';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  private async resolvePermissions(permissionIds?: string[]) {
    if (!permissionIds?.length) {
      return [];
    }
    const permissions = await this.permissionRepository.findBy({
      id: In(permissionIds),
    });
    if (permissions.length !== permissionIds.length) {
      throw new BadRequestException('Uno o más permisos no existen');
    }
    return permissions;
  }

  async create(tenantId: string, dto: CreateRoleDto) {
    const permissions = await this.resolvePermissions(dto.permissionIds);
    const role = this.roleRepository.create({
      tenantId,
      name: dto.name,
      description: dto.description,
      permissions,
    });
    return this.roleRepository.save(role);
  }

  async findAll(tenantId: string, query: PaginationQueryDto) {
    const qb = this.roleRepository
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.permissions', 'permissions')
      .where('role.tenantId = :tenantId', { tenantId });

    if (query.search) {
      qb.andWhere('role.name ILIKE :search', {
        search: `%${query.search}%`,
      });
    }

    qb.orderBy('role.name', 'ASC');

    return listOrPaginate(qb, query);
  }

  async findOne(tenantId: string, id: string) {
    const role = await this.roleRepository.findOne({
      where: { id, tenantId },
      relations: ['permissions'],
    });
    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }
    return role;
  }

  async update(tenantId: string, id: string, dto: UpdateRoleDto) {
    const role = await this.findOne(tenantId, id);

    if (dto.name !== undefined) role.name = dto.name;
    if (dto.description !== undefined) role.description = dto.description;
    if (dto.permissionIds !== undefined) {
      role.permissions = await this.resolvePermissions(dto.permissionIds);
    }

    return this.roleRepository.save(role);
  }

  async remove(tenantId: string, id: string) {
    const role = await this.findOne(tenantId, id);
    await this.roleRepository.remove(role);
    return { message: 'Rol eliminado correctamente' };
  }
}
