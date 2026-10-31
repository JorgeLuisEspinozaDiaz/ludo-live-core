import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { LudoColor } from 'src/common/enums';

export class CreatePurchaseDto {
  @ApiProperty({ enum: LudoColor })
  @IsEnum(LudoColor)
  color: LudoColor;

  @ApiProperty({ example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Promo activa opcional' })
  @IsOptional()
  @IsUUID()
  promoId?: string;
}

export class CancelPurchaseDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({
    description: 'Forzar cancelación aunque el saldo del usuario sea >= 0',
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class CancelUserPurchasesDto extends CancelPurchaseDto {
  @ApiProperty()
  @IsUUID()
  userId: string;
}
