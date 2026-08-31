import { Paginated } from './paginated';
import { PaginationParams } from './pagination-params';

/**
 * Phần delegate của Prisma mà helper này cần.
 *
 * `args` để `any` là CHỦ Ý: kiểu sinh ra cho `findMany` của Prisma dùng
 * conditional generic (`SelectSubset<T, ...>`) nên không một kiểu tường minh nào
 * khớp được với mọi model. An toàn kiểu được đảm bảo ở tầng trên qua generic
 * `TWhere`/`TOrderBy` của `PaginateOptions` — nơi caller thực sự viết truy vấn.
 */
interface PrismaDelegate {
  findMany(args: any): Promise<unknown>;
  count(args: any): Promise<number>;
}

interface PaginateOptions<TWhere, TOrderBy> {
  where?: TWhere;
  select?: Record<string, unknown>;
  include?: Record<string, unknown>;
  /**
   * Whitelist field được phép sắp xếp. BẮT BUỘC: `sortBy` đến thẳng từ query string,
   * truyền nguyên vào `orderBy` sẽ để client dò cấu trúc bảng. Bắt buộc tham số này
   * khiến việc "nhớ chặn" trở thành việc compiler ép phải làm.
   */
  allowedSortFields: readonly string[];
  /** Field dùng khi client không gửi `sortBy` hoặc gửi field không nằm trong whitelist. */
  defaultSortField: string;
  /** Ghi đè orderBy hoàn toàn (bỏ qua sortBy/whitelist) khi cần sắp xếp phức tạp. */
  orderBy?: TOrderBy;
}

/**
 * Chạy song song findMany + count và trả về `{ items, meta }`.
 *
 * KHÔNG bọc message/status — envelope do TransformInterceptor lo.
 */
export async function paginate<TItem, TWhere = unknown, TOrderBy = unknown>(
  delegate: PrismaDelegate,
  params: PaginationParams,
  options: PaginateOptions<TWhere, TOrderBy>,
): Promise<Paginated<TItem>> {
  const { page, itemsPerPage, skip, sort, sortBy } = params;
  const { where, select, include, allowedSortFields, defaultSortField } =
    options;

  const sortField =
    sortBy && allowedSortFields.includes(sortBy) ? sortBy : defaultSortField;
  const orderBy = options.orderBy ?? { [sortField]: sort };

  const findArgs: Record<string, unknown> = {
    where,
    orderBy,
    skip,
    take: itemsPerPage,
  };
  // Prisma không cho phép dùng đồng thời `select` và `include`.
  if (select) {
    findArgs.select = select;
  } else if (include) {
    findArgs.include = include;
  }

  const [items, total] = await Promise.all([
    delegate.findMany(findArgs) as Promise<TItem[]>,
    delegate.count({ where }),
  ]);

  return {
    items,
    meta: {
      total,
      page,
      pageSize: itemsPerPage,
      totalPages: Math.ceil(total / itemsPerPage),
    },
  };
}
