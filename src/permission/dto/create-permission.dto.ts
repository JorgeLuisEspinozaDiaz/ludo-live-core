import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({ example: 'catalog.view' })
  @IsString()
  @MaxLength(80)
  code: string;

  @ApiProperty({ example: 'Ver catálogo' })
  @IsString()
  @MaxLength(255)
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endpoint?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sectionId?: string;
}
