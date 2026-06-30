import { ExecutionContext, createParamDecorator } from '@nestjs/common';

import {
  BasePaginationParams,
  PaginationParams,
  SortOrder,
} from '@app/src/common/pagination/pagination-params';

const DEFAULT_ITEMS_PER_PAGE = 10;
const DEFAULT_PAGE = 1;
const MAX_ITEMS_PER_PAGE = 100;

/** Ép giá trị về số nguyên dương, fallback về default; chặn cận trên nếu có max. */
function toPositiveInt(value: unknown, fallback: number, max?: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  const intValue = Math.floor(parsed);
  return max ? Math.min(intValue, max) : intValue;
}

export const Pagination = createParamDecorator(
  (
    additionalFields: string[] = [],
    ctx: ExecutionContext,
  ): PaginationParams => {
    const request = ctx.switchToHttp().getRequest();
    const filters = request.query;

    // Chặn cận trên itemsPerPage để tránh client ép DB trả về toàn bộ bảng (DoS).
    const itemsPerPage = toPositiveInt(
      filters.itemsPerPage,
      DEFAULT_ITEMS_PER_PAGE,
      MAX_ITEMS_PER_PAGE,
    );
    const page = toPositiveInt(filters.page, DEFAULT_PAGE);
    const search = filters.search || '';
    const sort: SortOrder = filters.sort === 'asc' ? 'asc' : 'desc';

    const skip = page > DEFAULT_PAGE ? (page - DEFAULT_PAGE) * itemsPerPage : 0;

    const baseParams: BasePaginationParams = {
      itemsPerPage,
      page,
      skip,
      search,
      sort,
    };

    const additionalParams: Record<string, unknown> = {};
    additionalFields.forEach((field) => {
      if (
        filters[field] !== undefined &&
        filters[field] !== null &&
        filters[field] !== ''
      ) {
        additionalParams[field] = filters[field];
      }
    });

    return {
      ...baseParams,
      ...additionalParams,
    };
  },
);
