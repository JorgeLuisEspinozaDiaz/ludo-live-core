import { ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { EntityStatus } from 'src/common/enums';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password?: string;
}

export class ChangeUserStatusDto {
  @ApiPropertyOptional({ enum: EntityStatus })
  @IsEnum(EntityStatus, { message: 'Estado inválido' })
  status: EntityStatus;
}
