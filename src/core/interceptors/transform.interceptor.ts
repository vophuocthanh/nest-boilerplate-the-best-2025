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

import { RESPONSE_MESSAGE_KEY } from '@/shared/decorators/response-message.decorator';
import { SKIP_TRANSFORM_KEY } from '@/shared/decorators/skip-transform.decorator';
import { PaginationMeta, isPaginated } from '@/shared/pagination/paginated';

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

/**
 * NƠI DUY NHẤT tạo envelope `{ statusCode, message, data, meta? }`.
 *
 * Trước đây envelope được dựng ở ba tầng (ResponseUtil, paginate(), interceptor),
 * nên interceptor phải ĐOÁN NGƯỢC xem payload đã bọc hay chưa — dẫn tới việc một
 * service trả `{ data: ... }` hợp lệ về nghiệp vụ bị bóc mất một lớp.
 *
 * Hợp đồng mới, chỉ hai nhánh và không có heuristic nào:
 * - Service trả `Paginated<T>` (`{ items, meta }`) -> `data = items`, `meta = meta`.
 * - Còn lại                                        -> `data = payload` nguyên vẹn.
 *
 * `message` khai báo bằng `@ResponseMessage()`, mặc định `'Success'`.
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
    const targets = [context.getHandler(), context.getClass()];

    if (
      this.reflector.getAllAndOverride<boolean>(SKIP_TRANSFORM_KEY, targets)
    ) {
      return next.handle() as unknown as Observable<ApiResponse<T>>;
    }

    const message =
      this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, targets) ??
      'Success';
    const { statusCode } = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((payload) =>
        isPaginated(payload)
          ? {
              statusCode,
              message,
              data: payload.items as T,
              meta: payload.meta,
            }
          : { statusCode, message, data: (payload ?? null) as T },
      ),
    );
  }
}
