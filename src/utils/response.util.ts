import { PaginationResponse } from '@app/src/common/pagination/pagination-response';

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

  // Format any response with excluded fields
  static formatResponse<T>(data: T, excludeFields: string[] = []): T {
    if (Array.isArray(data)) {
      return data.map((item) => this.formatResponse(item, excludeFields)) as T;
    }

    if (typeof data === 'object' && data !== null) {
      const formattedData = { ...data } as Record<string, unknown>;
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
}
