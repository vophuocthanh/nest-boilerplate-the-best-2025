import { ExecutionContext, createParamDecorator } from '@nestjs/common';

import { SORT_BY_CREATE_AT } from '@app/src/configs/const';
import { numberConstants } from '@app/src/configs/consts';
import {
  PaginationParams,
  SortOrder,
} from '@app/src/core/model/pagination-params';

export const Pagination = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): PaginationParams => {
    const request = ctx.switchToHttp().getRequest();
    const filters = request.query;

    const itemsPerPage = Number(filters.itemsPerPage) || numberConstants.TEN;
    const page = Number(filters.page) || numberConstants.ONE;
    const search = filters.search || '';
    const sort = filters.sort as SortOrder | undefined;
    const sortBy = filters.sortBy || SORT_BY_CREATE_AT;
    const skip =
      page > numberConstants.ONE
        ? (page - numberConstants.ONE) * itemsPerPage
        : numberConstants.ZERO;

    return {
      itemsPerPage,
      page,
      skip,
      search,
      sort,
      sortBy,
    };
  },
);
