import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { FileUploadService } from '@app/src/lib/file-upload.service';
import { AuthController } from '@app/src/modules/auth/auth.controller';
import { AuthService } from '@app/src/modules/auth/auth.service';
import { MailService } from '@app/src/modules/mail/mail.service';
import { UserModule } from '@app/src/modules/user/user.module';
import { UserService } from '@app/src/modules/user/user.service';

const EXPIRES_IN = '60m';
@Module({
  imports: [
    UserModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      // Dùng chung secret ACCESS_TOKEN_KEY với HandleAuthGuard để token verify nhất quán
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('ACCESS_TOKEN_KEY'),
        signOptions: { expiresIn: EXPIRES_IN },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UserService, FileUploadService, MailService],
})
export class AuthModule {}
