import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import {
  awsConfig,
  googleConfig,
  jwtConfig,
  securityConfig,
} from './configs/configuration';
import { envValidationSchema } from './configs/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { MailModule } from './modules/mail/mail.module';
import { MessagesModule } from './modules/messages/messages.module';
import { RoleModule } from './modules/role/role.module';
import { UploadModule } from './modules/upload/upload.module';
import { UserModule } from './modules/user/user.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [jwtConfig, awsConfig, googleConfig, securityConfig],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
    // Cho phép dùng @Cron (vd: dọn refresh token hết hạn)
    ScheduleModule.forRoot(),
    // Rate limit toàn cục: tối đa 100 request / 60s cho mỗi IP
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AuthModule,
    UserModule,
    RoleModule,
    MailModule,
    UploadModule,
    MessagesModule,
    HealthModule,
  ],
  controllers: [AppController],
  // ValidationPipe được đăng ký một lần duy nhất ở main.ts (useGlobalPipes)
  providers: [
    AppService,
    // Chuẩn hoá mọi response thành { statusCode, message, data }
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    // Bắt mọi exception và trả về format lỗi thống nhất
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // Thứ tự guard: rate-limit -> xác thực JWT -> phân quyền role
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
