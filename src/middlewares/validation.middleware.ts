import { ValidationError } from 'class-validator';
import { Request, Response, NextFunction } from 'express';
import { HttpStatus } from '@nestjs/common';

/**
 * Interface mô tả cấu trúc phản hồi lỗi validation
 */
export interface ValidationErrorResponse {
  statusCode: number;
  message: { [key: string]: string };
  error: string;
}

/**
 * Interface cho lỗi của từng trường
 */
export interface ValidationFieldError {
  field: string;
  message: string;
}

/**
 * Middleware để xử lý việc hiển thị lỗi validation chi tiết
 * Được sử dụng sau khi ValidationPipe của NestJS đã xử lý
 */
export const validationMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!err || !err.response || !Array.isArray(err.response.message)) {
    return next(err);
  }

  const validationErrors = err.response.message as ValidationError[];
  const formattedErrors: { [key: string]: string } = {};
  const validationFieldErrors: ValidationFieldError[] = [];

  validationErrors.forEach((error) => {
    const fieldName = error.property;
    const constraints = error.constraints || {};

    const firstConstraintKey = Object.keys(constraints)[0];
    if (firstConstraintKey) {
      formattedErrors[fieldName] = constraints[firstConstraintKey];

      validationFieldErrors.push({
        field: fieldName,
        message: constraints[firstConstraintKey],
      });
    }
  });

  const errorResponse: ValidationErrorResponse = {
    statusCode: HttpStatus.BAD_REQUEST,
    message: formattedErrors,
    error: 'Bad Request',
  };

  (req as any).validationErrors = validationFieldErrors;

  return res.status(HttpStatus.BAD_REQUEST).json(errorResponse);
};

/**
 * Middleware để xử lý lỗi từ exception filter
 */
export const customExceptionMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (
    err &&
    err.response &&
    err.response.message &&
    typeof err.response.message === 'object'
  ) {
    const errorResponse = {
      statusCode: err.status || HttpStatus.BAD_REQUEST,
      message: err.response.message,
      error: err.response.error || 'Bad Request',
    };

    const validationErrors = Object.keys(err.response.message).map((field) => ({
      field,
      message: err.response.message[field],
    }));

    (req as any).validationErrors = validationErrors;

    return res.status(err.status || HttpStatus.BAD_REQUEST).json(errorResponse);
  }

  return next(err);
};

/**
 * Chuyển đổi lỗi từ nhiều nguồn khác nhau về một format chuẩn
 */
export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (res.headersSent) {
    return next(err);
  }

  customExceptionMiddleware(err, req, res, () => {
    if (res.headersSent) {
      return;
    }

    if (err.response && Array.isArray(err.response.message)) {
      return validationMiddleware(err, req, res, next);
    }

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = { general: 'Internal Server Error' };
    let errorName = 'InternalServerError';

    if (err.status || err.statusCode) {
      statusCode = err.status || err.statusCode;
    }

    if (err.message) {
      message = { general: err.message };
    }

    if (err.name) {
      errorName = err.name;
    }

    const errorResponse = {
      statusCode,
      message,
      error: errorName,
      timestamp: new Date().toISOString(),
      path: req.url,
    };

    return res.status(statusCode).json(errorResponse);
  });
};
