import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import {
  ListResult,
  PaginatedResult,
  PaginationQueryDto,
} from '../dto/pagination.dto';

export async function paginateQuery<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  page = 1,
  take = 10,
): Promise<PaginatedResult<T>> {
  const skip = (page - 1) * take;
  const [data, itemCount] = await qb.skip(skip).take(take).getManyAndCount();
  const pageCount = Math.ceil(itemCount / take) || 0;

  return {
    data: data ?? [],
    meta: {
      page,
      take,
      itemCount,
      pageCount,
      hasPreviousPage: page > 1,
      hasNextPage: page < pageCount,
    },
  };
}

/** Unifica listados: con meta o solo { data } (nunca array suelto; data siempre array). */
export async function listOrPaginate<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  query: PaginationQueryDto,
): Promise<PaginatedResult<T> | ListResult<T>> {
  if (!query.shouldPaginate) {
    const data = await qb.getMany();
    return { data: data ?? [] };
  }
  return paginateQuery(qb, query.page ?? 1, query.pageSize);
}
