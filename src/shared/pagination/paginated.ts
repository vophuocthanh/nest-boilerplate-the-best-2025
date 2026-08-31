/** Metadata phân trang trả về trong `meta` của response envelope. */
export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Kết quả phân trang do tầng repository/service trả về.
 *
 * Cố tình KHÔNG chứa `message`/`status`: việc bọc envelope là trách nhiệm duy nhất
 * của `TransformInterceptor`. `items` + `meta` là hai key đủ đặc trưng để interceptor
 * nhận diện mà không cần đoán mò như trước.
 */
export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}

/** Type guard dùng bởi TransformInterceptor. */
export function isPaginated(value: unknown): value is Paginated<unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<Paginated<unknown>>;
  return (
    Array.isArray(candidate.items) &&
    typeof candidate.meta === 'object' &&
    candidate.meta !== null &&
    typeof candidate.meta.total === 'number'
  );
}
