import {
  VERSION_NEUTRAL,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { json, urlencoded } from 'express';
import helmet from 'helmet';

import { setupSwagger } from '@app/src/configs/swagger.config';

import { AppModule } from './app.module';
import { buildCorsOptions } from './common/config/cors.config';
import { validationExceptionFactory } from './common/pipes/validation-exception.factory';
import { loggerMiddleware } from './middlewares/logger.middleware';
import { requestIdMiddleware } from './middlewares/request-id.middleware';

const API_PREFIX = 'api';
const PORT = Number(process.env.PORT) || 4040;
const BODY_LIMIT = '1mb';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix(API_PREFIX);

  // API versioning qua URI (vd /api/v1/...). VERSION_NEUTRAL: route không khai báo
  // version vẫn chạy như cũ -> bật sẵn cho boilerplate mà KHÔNG phá route hiện tại.
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: VERSION_NEUTRAL,
  });

  // Correlation id cho mỗi request (đặt sớm nhất để mọi log đều có id)
  app.use(requestIdMiddleware);

  // Giới hạn kích thước body để chặn payload quá lớn (DoS)
  app.use(json({ limit: BODY_LIMIT }));
  app.use(urlencoded({ extended: true, limit: BODY_LIMIT }));

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
      exceptionFactory: validationExceptionFactory,
    }),
  );

  app.use(loggerMiddleware);

  await app.listen(PORT);
}

bootstrap().catch((error) => {
  console.error('Application failed to start:', error);
  process.exit(1);
});
