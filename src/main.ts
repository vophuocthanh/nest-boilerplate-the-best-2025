import { ValidationPipe } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import helmet from 'helmet';

import { setupSwagger } from '@app/src/configs/swagger.config';

import { AppModule } from './app.module';
import { loggerMiddleware } from './middlewares/logger.middleware';
import { globalErrorHandler } from './middlewares/validation.middleware';

const API_PREFIX = 'api';
const PORT = Number(process.env.PORT) || 3001;

/**
 * Danh sách origin được phép.
 * - Production: chỉ cho phép các origin khai báo trong env CORS_ORIGIN (ngăn cách bằng dấu phẩy).
 * - Dev: cho phép tất cả để tiện debug.
 */
function buildCorsOptions(): CorsOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  const whitelist = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    origin: isProduction ? (whitelist.length ? whitelist : false) : true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
  };
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix(API_PREFIX);

  // Security headers
  app.use(helmet());
  app.enableCors(buildCorsOptions());

  // Đóng kết nối (Prisma, ...) an toàn khi nhận SIGTERM/SIGINT
  app.enableShutdownHooks();

  setupSwagger(app);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      stopAtFirstError: false,
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  app.use(loggerMiddleware);
  app.use(globalErrorHandler);

  await app.listen(PORT);
}

bootstrap().catch((error) => {
  console.error('Application failed to start:', error);
  process.exit(1);
});
