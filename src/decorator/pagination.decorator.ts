import { numberConstants } from '@app/src/configs/consts';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface PaginationParams {
  itemsPerPage: number;
  page: number;
  skip: number;
  search: string;
}

export const Pagination = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): PaginationParams => {
    const request = ctx.switchToHttp().getRequest();
    const filters = request.query;

    const itemsPerPage = Number(filters.items_per_page) || numberConstants.TEN;
    const page = Number(filters.page) || numberConstants.ONE;
    const search = filters.search || '';
    const skip =
      page > numberConstants.ONE
        ? (page - numberConstants.ONE) * itemsPerPage
        : numberConstants.ZERO;

    return {
      itemsPerPage,
      page,
      skip,
      search,
    };
  },
);
