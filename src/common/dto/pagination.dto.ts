import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

function toBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return undefined;
}

export class PaginationQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, description: 'Alias: take / itemsPerPage' })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  take?: number = 10;

  @ApiPropertyOptional({ example: 10 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  itemsPerPage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filtro por tipo' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    default: true,
    description: 'Si false, respuesta { data: [] } sin meta',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBoolean(value) ?? true)
  paginated?: boolean = true;

  /** Alias de `paginated` (el FE a veces envía paginate=false) */
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => toBoolean(value))
  paginate?: boolean;

  get pageSize(): number {
    return this.take ?? this.itemsPerPage ?? 10;
  }

  /** true = con meta; false = solo { data } */
  get shouldPaginate(): boolean {
    if (this.paginated === false || this.paginate === false) return false;
    return true;
  }
}

export interface PaginatedMeta {
  page: number;
  take: number;
  itemCount: number;
  pageCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface ListResult<T> {
  data: T[];
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginatedMeta;
}
