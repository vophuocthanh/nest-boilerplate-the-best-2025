import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { PrismaModule } from '@/core/database/prisma.module';
import { AllExceptionsFilter } from '@/core/filters/all-exceptions.filter';
import { JwtAuthGuard } from '@/core/guards/jwt-auth.guard';
import { RolesGuard } from '@/core/guards/roles.guard';
import { TransformInterceptor } from '@/core/interceptors/transform.interceptor';
import { loggerMiddleware } from '@/core/middlewares/logger.middleware';
import { requestIdMiddleware } from '@/core/middlewares/request-id.middleware';

/** Rate limit toàn cục: tối đa 100 request / 60s cho mỗi IP. */
const THROTTLE_TTL_MS = 60_000;
const THROTTLE_LIMIT = 100;

/**
 * Toàn bộ hạ tầng chạy cho MỌI request, gom về một chỗ.
 *
 * Trước đây phần này nằm rải giữa `app.module.ts` (filter/guard/interceptor) và
 * `main.ts` (middleware), nên không đọc được thứ tự pipeline ở một nơi duy nhất.
 * `AppModule` giờ chỉ còn nhiệm vụ liệt kê các feature module.
 */
@Module({
  imports: [
    PrismaModule,
    // Cho phép dùng @Cron (vd: dọn refresh token hết hạn).
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: THROTTLE_TTL_MS, limit: THROTTLE_LIMIT }]),
  ],
  providers: [
    // Chuẩn hoá mọi response thành { statusCode, message, data, meta? }.
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    // Bắt mọi exception và trả về format lỗi thống nhất.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // Thứ tự guard: rate-limit -> xác thực JWT -> phân quyền role.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [PrismaModule],
})
export class CoreModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // requestId phải chạy TRƯỚC logger để mọi dòng log đều mang correlation id.
    consumer.apply(requestIdMiddleware, loggerMiddleware).forRoutes('*');
  }
}
