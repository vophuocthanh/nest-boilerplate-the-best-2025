import { BadRequestException } from '@nestjs/common';

import { ValidationError } from 'class-validator';

/**
 * Chuyển lỗi của class-validator thành BadRequestException dạng
 * { message: { [field]: 'thông báo lỗi đầu tiên' }, error: 'Bad Request' }.
 * Dùng cho ValidationPipe.exceptionFactory để giữ format lỗi nhất quán cho FE.
 */
export const validationExceptionFactory = (errors: ValidationError[]) => {
  const formatted: Record<string, string> = {};

  for (const error of errors) {
    const firstConstraint = Object.values(error.constraints ?? {})[0];
    if (firstConstraint) {
      formatted[error.property] = firstConstraint;
    }
  }

  return new BadRequestException({
    message: formatted,
    error: 'Bad Request',
  });
};
