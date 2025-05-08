export interface PaginationMeta {
  total: number;
  currentPage: number;
  itemsPerPage: number;
  totalPages?: number;
}

export interface ResponseFormat<T> {
  data: T;
  total?: number;
  currentPage?: number;
  itemsPerPage?: number;
  totalPages?: number;
  message?: string;
  status?: number;
}
