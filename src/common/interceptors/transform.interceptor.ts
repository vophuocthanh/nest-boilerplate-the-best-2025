import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { SKIP_TRANSFORM_KEY } from '@app/src/common/decorators/skip-transform.decorator';

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
}

/**
 * Bọc mọi response thành { statusCode, message, data, meta? } thống nhất.
 *
 * Quy ước nhận diện payload từ controller/service:
 * - Có `total` (kèm `data`)      -> tách phân trang ra `meta`.
 * - Có `message`/`data`          -> coi là envelope sẵn, lấy message + data tương ứng.
 * - Còn lại                      -> dùng nguyên giá trị làm `data`.
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TRANSFORM_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) {
      return next.handle() as unknown as Observable<ApiResponse<T>>;
    }

    const statusCode = context
      .switchToHttp()
      .getResponse<Response>().statusCode;
    return next
      .handle()
      .pipe(map((payload) => this.format(payload, statusCode)));
  }

  private format(payload: unknown, statusCode: number): ApiResponse<T> {
    if (payload === null || payload === undefined) {
      return { statusCode, message: 'Success', data: null as T };
    }

    if (this.isPlainObject(payload)) {
      const {
        message,
        data,
        total,
        currentPage,
        itemsPerPage,
        totalPages,
        status,
        ...rest
      } = payload as Record<string, unknown>;
      void status; // bỏ qua trường `status` cũ từ ResponseUtil (đã có statusCode)

      const resolvedMessage = typeof message === 'string' ? message : 'Success';

      if (total !== undefined) {
        return {
          statusCode,
          message: resolvedMessage,
          data: (data ?? null) as T,
          meta: this.clean({
            total,
            page: currentPage,
            pageSize: itemsPerPage,
            totalPages,
          }),
        };
      }

      if ('data' in payload || 'message' in payload) {
        const resolvedData =
          'data' in payload ? data : Object.keys(rest).length ? rest : null;
        return {
          statusCode,
          message: resolvedMessage,
          data: resolvedData as T,
        };
      }
    }

    return { statusCode, message: 'Success', data: payload as T };
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private clean(meta: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(meta).filter(([, v]) => v !== undefined),
    );
  }
}
