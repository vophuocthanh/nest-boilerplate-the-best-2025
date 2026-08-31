export type SortOrder = 'asc' | 'desc';

/** Tham số phân trang đã được chuẩn hoá bởi `@Pagination()`. */
export interface PaginationParams {
  page: number;
  itemsPerPage: number;
  skip: number;
  search: string;
  sort: SortOrder;
  /** Field sắp xếp do client gửi lên — LUÔN phải đối chiếu với whitelist trước khi dùng. */
  sortBy?: string;
}
