import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CoreModule } from '@/core/core.module';

import { AppController } from './app.controller';
import {
  awsConfig,
  googleConfig,
  jwtConfig,
  securityConfig,
} from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { MessagesModule } from './modules/messages/messages.module';
import { RoleModule } from './modules/role/role.module';
import { UploadModule } from './modules/upload/upload.module';
import { UserModule } from './modules/user/user.module';

/**
 * Root module — chỉ còn hai việc: nạp config và liệt kê feature module.
 *
 * Toàn bộ hạ tầng chạy cho mọi request (filter, interceptor, guard, middleware,
 * throttler, scheduler, Prisma) đã gom về {@link CoreModule}.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [jwtConfig, awsConfig, googleConfig, securityConfig],
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),
    CoreModule,

    AuthModule,
    UserModule,
    RoleModule,
    UploadModule,
    MessagesModule,
    HealthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
