import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { EntityStatus } from 'src/common/enums';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { listOrPaginate } from 'src/common/utils/pagination.helper';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(tenantId: string, dto: CreateUserDto, createdBy?: string) {
    const exists = await this.userRepository.findOne({
      where: [
        { tenantId, username: dto.username },
        ...(dto.email ? [{ tenantId, email: dto.email }] : []),
      ],
    });
    if (exists) {
      throw new BadRequestException(
        'Ya existe un usuario con ese username o email en el tenant',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      tenantId,
      username: dto.username,
      email: dto.email,
      password: hashedPassword,
      roleId: dto.roleId,
      status: dto.status ?? EntityStatus.ACTIVE,
      createdBy: createdBy ?? null,
    });
    return this.userRepository.save(user);
  }

  async findAll(tenantId: string, query: PaginationQueryDto) {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.tenant_id = :tenantId', { tenantId })
      .orderBy('user.createdAt', 'DESC');

    if (query.search) {
      qb.andWhere(
        '(user.username ILIKE :search OR user.email ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }
    if (query.status) {
      qb.andWhere('user.status = :status', { status: query.status });
    }

    return listOrPaginate(qb, query);
  }

  async findOne(tenantId: string, id: string) {
    const user = await this.userRepository.findOne({
      where: { id, tenantId },
      relations: ['role', 'role.permissions'],
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  async findByUsernameOrEmail(tenantId: string, usernameOrEmail: string) {
    return this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('role.permissions', 'permissions')
      .leftJoinAndSelect('permissions.section', 'section')
      .leftJoinAndSelect('section.menu', 'menu')
      .where('user.tenant_id = :tenantId', { tenantId })
      .andWhere(
        '(LOWER(user.username) = LOWER(:q) OR LOWER(user.email) = LOWER(:q))',
        { q: usernameOrEmail },
      )
      .getOne();
  }

  async findAuthContext(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: [
        'role',
        'role.permissions',
        'role.permissions.section',
        'role.permissions.section.menu',
      ],
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  async update(tenantId: string, id: string, dto: UpdateUserDto, updatedBy?: string) {
    const user = await this.findOne(tenantId, id);

    if (dto.username && dto.username !== user.username) {
      const clash = await this.userRepository.findOne({
        where: { tenantId, username: dto.username },
      });
      if (clash) {
        throw new BadRequestException('El username ya está en uso');
      }
      user.username = dto.username;
    }
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.roleId) user.roleId = dto.roleId;
    if (dto.status) user.status = dto.status;
    if (dto.password) {
      user.password = await bcrypt.hash(dto.password, 10);
    }
    user.updatedBy = updatedBy ?? null;
    return this.userRepository.save(user);
  }

  async changeStatus(tenantId: string, id: string, status: EntityStatus, updatedBy?: string) {
    const user = await this.findOne(tenantId, id);
    user.status = status;
    user.updatedBy = updatedBy ?? null;
    return this.userRepository.save(user);
  }

  async remove(tenantId: string, id: string, updatedBy?: string) {
    return this.changeStatus(tenantId, id, EntityStatus.INACTIVE, updatedBy);
  }
}
