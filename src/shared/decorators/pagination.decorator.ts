import { ExecutionContext, createParamDecorator } from '@nestjs/common';

import { Request } from 'express';

import {
  PaginationParams,
  SortOrder,
} from '@/shared/pagination/pagination-params';

const DEFAULT_PAGE = 1;
const DEFAULT_ITEMS_PER_PAGE = 10;
const MAX_ITEMS_PER_PAGE = 100;

/** Ép về số nguyên dương, fallback về default; chặn cận trên nếu có max. */
function toPositiveInt(value: unknown, fallback: number, max?: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  const intValue = Math.floor(parsed);
  return max ? Math.min(intValue, max) : intValue;
}

function toStringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/**
 * Chuẩn hoá query string phân trang thành `PaginationParams`.
 *
 * `sortBy` được trả về NGUYÊN VĂN; việc đối chiếu whitelist thuộc về `paginate()`
 * — nơi bắt buộc phải khai báo `allowedSortFields`.
 */
export const Pagination = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): PaginationParams => {
    const { query } = ctx.switchToHttp().getRequest<Request>();

    // Chặn cận trên itemsPerPage để client không ép DB trả về cả bảng (DoS).
    const itemsPerPage = toPositiveInt(
      query.itemsPerPage,
      DEFAULT_ITEMS_PER_PAGE,
      MAX_ITEMS_PER_PAGE,
    );
    const page = toPositiveInt(query.page, DEFAULT_PAGE);
    const sort: SortOrder = query.sort === 'asc' ? 'asc' : 'desc';

    return {
      page,
      itemsPerPage,
      skip: (page - DEFAULT_PAGE) * itemsPerPage,
      search: toStringOrUndefined(query.search) ?? '',
      sort,
      sortBy: toStringOrUndefined(query.sortBy),
    };
  },
);
