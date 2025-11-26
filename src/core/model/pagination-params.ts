export type SortOrder = 'asc' | 'desc';

export interface BasePaginationParams {
  itemsPerPage: number;
  page: number;
  skip: number;
  search: string;
  sort?: SortOrder;
}

export type PaginationParams = BasePaginationParams & Record<string, unknown>;
