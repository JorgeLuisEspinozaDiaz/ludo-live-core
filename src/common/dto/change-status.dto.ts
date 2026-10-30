import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { EntityStatus } from 'src/common/enums';

export class ChangeStatusDto {
  @ApiProperty({ enum: EntityStatus, example: EntityStatus.ACTIVE })
  @IsEnum(EntityStatus)
  status: EntityStatus;
}
