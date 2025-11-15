export type SortOrder = 'asc' | 'desc';

export interface PaginationParams {
  itemsPerPage: number;
  page: number;
  skip: number;
  search: string;
  sort?: SortOrder;
  sortBy?: string;
}
