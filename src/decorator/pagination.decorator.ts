import { ExecutionContext, createParamDecorator } from '@nestjs/common';

import { numberConstants } from '@app/src/configs/consts';
import {
  BasePaginationParams,
  PaginationParams,
  SortOrder,
} from '@app/src/core/model/pagination-params';

export const Pagination = createParamDecorator(
  (
    additionalFields: string[] = [],
    ctx: ExecutionContext,
  ): PaginationParams => {
    const request = ctx.switchToHttp().getRequest();
    const filters = request.query;

    const itemsPerPage = Number(filters.itemsPerPage) || numberConstants.TEN;
    const page = Number(filters.page) || numberConstants.ONE;
    const search = filters.search || '';
    const sort = filters.sort as SortOrder | undefined;

    const skip =
      page > numberConstants.ONE
        ? (page - numberConstants.ONE) * itemsPerPage
        : numberConstants.ZERO;

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
