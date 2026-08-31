import {
  VERSION_NEUTRAL,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { NextFunction, Request, Response, json, urlencoded } from 'express';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { buildCorsOptions } from './config/cors.config';
import { setupSwagger } from './config/swagger/swagger.config';
import { validationExceptionFactory } from './core/pipes/validation-exception.factory';

const API_PREFIX = 'api';
const SWAGGER_PATH_PREFIX = '/docs';
const DEFAULT_PORT = 4040;
const BODY_LIMIT = '1mb';

/**
 * Chỉ còn phần CHỈ làm được ở tầng bootstrap (cần instance app):
 * prefix, versioning, security headers, CORS, body parser, Swagger, shutdown hook.
 * Middleware ứng dụng (requestId, logger) đã chuyển vào CoreModule.configure().
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Tự đăng ký body parser để giới hạn kích thước là tường minh, thay vì
    // dựa vào thứ tự ngầm giữa app.use() và parser mặc định của Nest.
    bodyParser: false,
  });

  app.setGlobalPrefix(API_PREFIX);

  // API versioning qua URI (vd /api/v1/...). VERSION_NEUTRAL: route không khai
  // báo version vẫn chạy như cũ -> bật sẵn mà KHÔNG phá route hiện tại.
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: VERSION_NEUTRAL,
  });

  // Giới hạn kích thước body để chặn payload quá lớn (DoS).
  app.use(json({ limit: BODY_LIMIT }));
  app.use(urlencoded({ extended: true, limit: BODY_LIMIT }));

  // Security headers. CSP nghiêm ngặt cho API; riêng Swagger UI (/docs) phải tắt
  // CSP vì Swagger UI và theme-toggle dùng inline script mà `script-src 'self'`
  // sẽ chặn.
  const strictHelmet = helmet();
  const docsHelmet = helmet({ contentSecurityPolicy: false });
  app.use((req: Request, res: Response, next: NextFunction) =>
    req.path.startsWith(SWAGGER_PATH_PREFIX)
      ? docsHelmet(req, res, next)
      : strictHelmet(req, res, next),
  );
  app.enableCors(buildCorsOptions());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: false,
      exceptionFactory: validationExceptionFactory,
    }),
  );

  // Trust proxy: cho phép Express lấy IP thật của client khi đứng sau
  // nginx/load balancer. Cần cho rate limiting và log IP chính xác ở production.
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // Chỉ bật Swagger UI ở dev/test — tránh lộ API spec ở production.
  if (process.env.NODE_ENV !== 'production') {
    setupSwagger(app);
  }

  // Đóng kết nối (Prisma, ...) an toàn khi nhận SIGTERM/SIGINT.
  app.enableShutdownHooks();

  await app.listen(Number(process.env.PORT) || DEFAULT_PORT);
}

bootstrap().catch((error) => {
  console.error('Application failed to start:', error);
  process.exit(1);
});
