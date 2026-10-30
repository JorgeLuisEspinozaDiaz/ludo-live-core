import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTenantConfigDto {
  @ApiPropertyOptional({ example: 'PEN' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ example: 18 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  igvRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  tradeName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'T001' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  ticketSeries?: string;

  @ApiPropertyOptional({ example: 'B001' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  boletaSeries?: string;

  @ApiPropertyOptional({ example: 'F001' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  facturaSeries?: string;
}
