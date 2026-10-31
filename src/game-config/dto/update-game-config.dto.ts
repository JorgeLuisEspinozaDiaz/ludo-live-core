import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateGameConfigDto {
  @ApiPropertyOptional({ description: 'Precio casilla en céntimos', example: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  priceCents?: number;

  @ApiPropertyOptional({ description: 'Premio casilla en céntimos', example: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  prizeCents?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  slotsPerColor?: number;

  @ApiPropertyOptional({ example: 10, description: 'Puntos por unidad de canje' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pointsPerSol?: number;

  @ApiPropertyOptional({ example: 100, description: 'Céntimos por unidad de canje' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  centsPerRedeemUnit?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minRedeemPoints?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  redeemPointsMultiple?: number;
}
