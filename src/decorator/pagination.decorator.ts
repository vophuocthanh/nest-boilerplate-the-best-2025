import { ExecutionContext, createParamDecorator } from '@nestjs/common';

import {
  BasePaginationParams,
  PaginationParams,
  SortOrder,
} from '@app/src/core/model/pagination-params';

const DEFAULT_ITEMS_PER_PAGE = 10;
const DEFAULT_PAGE = 1;

export const Pagination = createParamDecorator(
  (
    additionalFields: string[] = [],
    ctx: ExecutionContext,
  ): PaginationParams => {
    const request = ctx.switchToHttp().getRequest();
    const filters = request.query;

    const itemsPerPage = Number(filters.itemsPerPage) || DEFAULT_ITEMS_PER_PAGE;
    const page = Number(filters.page) || DEFAULT_PAGE;
    const search = filters.search || '';
    const sort = filters.sort as SortOrder | undefined;

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
