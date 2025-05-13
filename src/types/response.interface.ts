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

/**
 * Interface chuẩn cho phản hồi API thành công
 */
export interface ApiResponse<T> {
  statusCode: number;
  message: string | { [key: string]: string };
  data?: T;
  error?: string;
}

/**
 * Hàm tạo phản hồi thành công
 */
export function createSuccessResponse<T>(
  data?: T,
  message: string = 'Success',
): ApiResponse<T> {
  return {
    statusCode: 200,
    message,
    data,
  };
}

/**
 * Hàm tạo phản hồi lỗi
 */
export function createErrorResponse(
  statusCode: number = 400,
  message: string | { [key: string]: string } = 'Bad Request',
  error: string = 'Bad Request',
): ApiResponse<null> {
  return {
    statusCode,
    message,
    error,
  };
}
