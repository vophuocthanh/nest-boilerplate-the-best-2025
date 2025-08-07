import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { HTTP_STATUS_MESSAGE } from '@app/src/constants/http-status.constant';
import { ApiResponse } from '@app/src/types/response.interface';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode || HttpStatus.OK;

        if (data && typeof data === 'object' && 'message' in data) {
          if (Object.keys(data).length === 1 && 'message' in data) {
            return {
              statusCode,
              message: this.getStatusMessage(statusCode, data.message),
              ...(Object.keys(data).filter((key) => key !== 'message').length >
              0
                ? { data: data }
                : {}),
            };
          }

          if ('statusCode' in data) {
            return {
              ...data,
              message: this.getStatusMessage(data.statusCode, data.message),
            };
          }

          return {
            statusCode,
            message: this.getStatusMessage(statusCode, data.message),
            ...data,
          };
        }

        return {
          statusCode,
          message: this.getStatusMessage(statusCode),
          data,
        };
      }),
    );
  }

  private getStatusMessage(statusCode: number, customMessage?: string): string {
    if (customMessage) {
      return customMessage;
    }

    const statusEntry = Object.entries(HTTP_STATUS_MESSAGE).find(
      ([, value]) => value.code === statusCode,
    );

    return statusEntry ? statusEntry[1].message : 'Thành công';
  }
}
