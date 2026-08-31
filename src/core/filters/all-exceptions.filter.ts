import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { Request, Response } from 'express';

interface NormalizedError {
  status: number;
  message: string | Record<string, unknown>;
  error: string;
}

/**
 * Filter toàn cục: chuẩn hoá MỌI exception (HttpException, lỗi Prisma, lỗi không
 * lường trước) về cùng một format. Thay thế hoàn toàn cho Express error middleware cũ.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, error } = this.normalize(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else if (status >= HttpStatus.BAD_REQUEST) {
      // Log 4xx ở mức warn để còn triage bug phía client trong production,
      // nhưng không kèm stack để tránh nhiễu log.
      this.logger.warn(
        `${request.method} ${request.url} -> ${status} ${error}`,
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: request.id,
    });
  }

  private normalize(exception: unknown): NormalizedError {
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        return {
          status: exception.getStatus(),
          message: res,
          error: exception.name,
        };
      }
      const body = res as Record<string, unknown>;
      return {
        status: exception.getStatus(),
        message: (body.message as string) ?? exception.message,
        error: (body.error as string) ?? exception.name,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.normalizePrisma(exception);
    }

    // Truy vấn/đối số sai (vd thiếu field bắt buộc) -> lỗi phía client (400)
    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'Invalid database query',
        error: 'BadRequest',
      };
    }

    // Không kết nối được DB -> service tạm thời không khả dụng (503)
    if (exception instanceof Prisma.PrismaClientInitializationError) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Database is unavailable',
        error: 'ServiceUnavailable',
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'InternalServerError',
    };
  }

  private normalizePrisma(
    exception: Prisma.PrismaClientKnownRequestError,
  ): NormalizedError {
    switch (exception.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          message: 'Resource already exists',
          error: 'Conflict',
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Resource not found',
          error: 'NotFound',
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Related resource does not exist',
          error: 'ForeignKeyConstraint',
        };
      case 'P2014':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'The change violates a required relation',
          error: 'RelationViolation',
        };
      default:
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Database request error',
          error: 'BadRequest',
        };
    }
  }
}
