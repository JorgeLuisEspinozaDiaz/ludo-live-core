import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { EntityStatus } from 'src/common/enums';

export class PlatformLoginDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty()
  @IsString()
  @MinLength(4)
  password: string;
}

export class CreateTenantDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tenantName: string;

  @ApiProperty({ description: 'Slug único (subdominio)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug: solo minúsculas, números y guiones',
  })
  tenantSlug: string;

  @ApiProperty({ description: 'Usuario admin del tenant' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminName?: string;
}

export class UpdateTenantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug: solo minúsculas, números y guiones',
  })
  slug?: string;
}

export class ResetTenantAdminPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;
}

export class ChangeTenantStatusDto {
  @ApiProperty({ enum: EntityStatus })
  @IsEnum(EntityStatus)
  status: EntityStatus;
}
