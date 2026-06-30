export interface PaginationResponse<T> {
  data: T;
  total?: number;
  currentPage?: number;
  itemsPerPage?: number;
  totalPages?: number;
  message?: string;
  status?: number;
}
