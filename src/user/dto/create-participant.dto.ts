import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateParticipantDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'PIN de acceso al vivo (mín. 4)' })
  @IsString()
  @MinLength(4)
  password: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Nuevo PIN' })
  @IsString()
  @MinLength(4)
  password: string;
}
