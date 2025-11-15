export interface PaginationMeta {
  total: number;
  currentPage: number;
  itemsPerPage: number;
  totalPages?: number;
}

/**
 * Interface for API response
 */
export interface ApiResponse<T> {
  statusCode: number;
  message: string | { [key: string]: string };
  data?: T;
  error?: string;
}

/**
 * Function to create a success response
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
 * Function to create an error response
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
