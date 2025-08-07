import { ValidationPipe } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { setupSwagger } from '@app/src/configs/swagger.config';

import { AppModule } from './app.module';
import { loggerMiddleware } from './middlewares/logger.middleware';
import { globalErrorHandler } from './middlewares/validation.middleware';

const API_PREFIX = 'api';
const PORT = 3001;

const CORS_OPTIONS: CorsOptions = {
  origin: '*',
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  credentials: true,
};

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix(API_PREFIX);
  app.enableCors(CORS_OPTIONS);
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

  // app.useGlobalInterceptors(new ResponseInterceptor());

  app.use(loggerMiddleware);
  app.use(globalErrorHandler);

  await app.listen(PORT);
}

bootstrap().catch((error) => {
  console.error('Application failed to start:', error);
  process.exit(1);
});
