import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { LudoColor } from 'src/common/enums';

export class CreateRoundDto {
  @ApiPropertyOptional({ description: 'Override precio céntimos' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  priceCents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  prizeCents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  slotsPerColor?: number;
}

export class UpdateRoundDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  priceCents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  prizeCents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  slotsPerColor?: number;
}

export class FinishRoundDto {
  @ApiProperty({ enum: LudoColor })
  @IsEnum(LudoColor)
  winnerColor: LudoColor;
}

export class CancelRoundDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;
}
