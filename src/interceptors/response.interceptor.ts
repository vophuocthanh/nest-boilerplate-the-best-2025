import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../types/response.interface';

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
              message: data.message,
              ...(Object.keys(data).filter((key) => key !== 'message').length >
              0
                ? { data: data }
                : {}),
            };
          }

          if ('statusCode' in data) {
            return data;
          }

          return {
            statusCode,
            ...data,
          };
        }

        return {
          statusCode,
          message: 'Success',
          data,
        };
      }),
    );
  }
}
