import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { envValidationSchema } from './configs/env.validation';
import { PrismaModule } from './helpers/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { MailModule } from './modules/mail/mail.module';
import { MessagesModule } from './modules/messages/messages.module';
import { RoleModule } from './modules/role/role.module';
import { UploadModule } from './modules/upload/upload.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
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
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
