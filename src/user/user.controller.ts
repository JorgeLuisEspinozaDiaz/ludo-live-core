import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, TenantId } from 'src/common/decorators/auth.decorators';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { PermissionCode } from 'src/common/enums';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangeUserStatusDto, UpdateUserDto } from './dto/update-user.dto';
import {
  CreateParticipantDto,
  ResetPasswordDto,
} from './dto/create-participant.dto';
import { CreateAccessLinkDto } from 'src/auth/dto/login.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @RequirePermissions(PermissionCode.SYSTEM_ADMIN)
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateUserDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.userService.create(tenantId, dto, user?.id);
  }

  @Post('participants')
  @RequirePermissions(PermissionCode.SYSTEM_ADMIN)
  createParticipant(
    @TenantId() tenantId: string,
    @Body() dto: CreateParticipantDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.userService.createParticipant(tenantId, dto, user?.id);
  }

  @Get()
  @RequirePermissions(PermissionCode.SYSTEM_ADMIN)
  findAll(@TenantId() tenantId: string, @Query() query: PaginationQueryDto) {
    return this.userService.findAll(tenantId, query);
  }

  @Get(':id')
  @RequirePermissions(PermissionCode.SYSTEM_ADMIN)
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.userService.findOne(tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.SYSTEM_ADMIN)
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.userService.update(tenantId, id, dto, user?.id);
  }

  @Put(':id/change-status')
  @RequirePermissions(PermissionCode.SYSTEM_ADMIN)
  changeStatus(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeUserStatusDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.userService.changeStatus(tenantId, id, dto.status, user?.id);
  }

  @Delete(':id')
  @RequirePermissions(PermissionCode.SYSTEM_ADMIN)
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.userService.remove(tenantId, id, user?.id);
  }

  @Post(':id/reset-password')
  @RequirePermissions(PermissionCode.SYSTEM_ADMIN)
  resetPassword(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.userService.resetPassword(tenantId, id, dto.password, user?.id);
  }

  /** Genera token para link directo (sin PIN) */
  @Post(':id/access-link')
  @RequirePermissions(PermissionCode.SYSTEM_ADMIN)
  createAccessLink(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAccessLinkDto,
  ) {
    return this.userService.createAccessLink(tenantId, id, {
      liveId: dto.liveId,
      expiresInDays: dto.expiresInDays,
    });
  }
}
