import { PaginationResponse } from '@app/src/core/model/pagination-response';

interface PrismaModelDelegate<T> {
  findMany(args: any): Promise<T[]>;
  count(args: any): Promise<number>;
}

interface PaginateArgs {
  where?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  select?: Record<string, unknown>;
  include?: Record<string, unknown>;
  page: number;
  itemsPerPage: number;
  skip: number;
}

/**
 * run findMany + count parallel and wrapped result follow format pagination standard.
 */
export async function paginate<T>(
  delegate: PrismaModelDelegate<T>,
  args: PaginateArgs,
): Promise<PaginationResponse<T[]>> {
  const { where, orderBy, select, include, page, itemsPerPage, skip } = args;

  const findArgs: Record<string, unknown> = {
    where,
    orderBy,
    skip,
    take: itemsPerPage,
  };
  // select and include not use simultaneously in Prisma.
  if (select) findArgs.select = select;
  else if (include) findArgs.include = include;

  const [data, total] = await Promise.all([
    delegate.findMany(findArgs),
    delegate.count({ where }),
  ]);

  const totalPages = Math.ceil(total / itemsPerPage);
  return {
    data,
    total,
    currentPage: page,
    itemsPerPage,
    totalPages,
    message: 'Success',
    status: 200,
  };
}
