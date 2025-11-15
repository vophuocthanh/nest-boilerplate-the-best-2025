import { PaginationResponse } from '@app/src/core/model/pagination-response';

export class ResponseUtil {
  static success<T>(
    data: T,
    message: string = 'Success',
    status: number = 200,
  ): PaginationResponse<T> {
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
  ): PaginationResponse<T[]> {
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
  ): PaginationResponse<null> {
    return {
      data: null,
      message,
      status,
    };
  }

  // Format any response with excluded fields
  static formatResponse<T>(data: T, excludeFields: string[] = []): T {
    if (Array.isArray(data)) {
      return data.map((item) => this.formatResponse(item, excludeFields)) as T;
    }

    if (typeof data === 'object' && data !== null) {
      const formattedData = { ...data };
      excludeFields.forEach((field) => {
        delete formattedData[field];
      });
      return formattedData as T;
    }

    return data;
  }

  static formatUserResponse<T>(user: T): T {
    const defaultExcludedFields = [
      'password',
      'confirmPassword',
      'verificationCode',
      'verificationCodeExpiresAt',
    ];
    return this.formatResponse(user, defaultExcludedFields);
  }

  // Format message response with default excluded fields
  static formatMessageResponse<T>(message: T): T {
    const defaultExcludedFields = ['deletedAt'];
    return this.formatResponse(message, defaultExcludedFields);
  }
}
