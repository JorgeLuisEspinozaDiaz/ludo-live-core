import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'Usuario o email' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty()
  @IsString()
  @MinLength(4)
  password: string;

  @ApiPropertyOptional({ description: 'Slug o UUID del tenant' })
  @IsOptional()
  @IsString()
  tenant?: string;
}

export class LoginPinDto {
  @ApiProperty({ description: 'PIN de acceso del jugador' })
  @IsString()
  @MinLength(4)
  pin: string;

  @ApiPropertyOptional({ description: 'Slug o UUID del tenant' })
  @IsOptional()
  @IsString()
  tenant?: string;
}

export class RedeemInviteDto {
  @ApiProperty({ description: 'Token de acceso directo generado por el admin' })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class CreateAccessLinkDto {
  @ApiPropertyOptional({ description: 'Live al que redirigir tras entrar' })
  @IsOptional()
  @IsUUID()
  liveId?: string;

  @ApiPropertyOptional({ description: 'Días de vigencia (default 7)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  expiresInDays?: number;
}

export class BootstrapDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tenantName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tenantSlug: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminName?: string;
}
