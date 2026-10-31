import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class RegisterPaymentDto {
  @ApiProperty({ description: 'Monto en céntimos', example: 1000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountCents: number;

  @ApiPropertyOptional({ example: 'YAPE' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class AdjustWalletDto {
  @ApiProperty({ description: 'Monto firmado en céntimos' })
  @Type(() => Number)
  @IsInt()
  amountCents: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;
}
