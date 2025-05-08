import { ResponseFormat } from '../types/response.interface';

export class ResponseUtil {
  static success<T>(
    data: T,
    message: string = 'Success',
    status: number = 200,
  ): ResponseFormat<T> {
    return {
      data,
      message,
      status,
    };
  }

  static paginate<T>(
    data: T[],
    total: number,
    currentPage: number,
    itemsPerPage: number,
    message: string = 'Success',
  ): ResponseFormat<T[]> {
    const totalPages = Math.ceil(total / itemsPerPage);
    return {
      data,
      total,
      currentPage,
      itemsPerPage,
      totalPages,
      message,
      status: 200,
    };
  }

  static error(
    message: string = 'Error',
    status: number = 400,
  ): ResponseFormat<null> {
    return {
      data: null,
      message,
      status,
    };
  }
}
