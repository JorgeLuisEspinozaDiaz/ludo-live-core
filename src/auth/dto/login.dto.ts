import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

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
