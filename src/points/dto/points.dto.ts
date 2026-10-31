import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class RedeemPointsDto {
  @ApiProperty({ example: 300 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  points: number;
}

export class AdjustPointsDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  amount: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;
}
