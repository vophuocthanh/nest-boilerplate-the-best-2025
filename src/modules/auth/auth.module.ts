import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from '@app/src/modules/auth/auth.controller';
import { AuthService } from '@app/src/modules/auth/auth.service';
import { PasswordService } from '@app/src/modules/auth/services/password.service';
import { RegistrationService } from '@app/src/modules/auth/services/registration.service';
import { TokenService } from '@app/src/modules/auth/services/token.service';
import { GoogleStrategy } from '@app/src/modules/auth/strategies/google.strategy';
import { JwtStrategy } from '@app/src/modules/auth/strategies/jwt.strategy';
import { TokenCleanupService } from '@app/src/modules/auth/token-cleanup.service';
import { MailService } from '@app/src/modules/mail/mail.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.accessSecret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.accessExpiresIn'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    RegistrationService,
    PasswordService,
    JwtStrategy,
    TokenCleanupService,
    MailService,
    // Chỉ đăng ký GoogleStrategy khi đã cấu hình Google OAuth.
    // Tránh passport-google-oauth20 ném lỗi lúc khởi động khi thiếu clientID.
    {
      provide: GoogleStrategy,
      useFactory: (configService: ConfigService) =>
        configService.get<string>('google.clientId')
          ? new GoogleStrategy(configService)
          : null,
      inject: [ConfigService],
    },
  ],
})
export class AuthModule {}
