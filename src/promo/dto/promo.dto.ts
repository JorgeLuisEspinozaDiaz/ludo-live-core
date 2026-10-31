import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { LudoColor } from 'src/common/enums';

export class CreatePromoDto {
  @ApiProperty({ enum: LudoColor })
  @IsEnum(LudoColor)
  color: LudoColor;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  slots: number;

  @ApiProperty({ example: 5, description: 'Multiplicador de puntos' })
  @Type(() => Number)
  @IsInt()
  @Min(2)
  multiplier: number;
}

export class UpdatePromoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
