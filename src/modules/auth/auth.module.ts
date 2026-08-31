import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

import { JwtCoreModule } from '@/core/jwt/jwt-core.module';
import { MailModule } from '@/integrations/mail/mail.module';
import { RoleModule } from '@/modules/role/role.module';
import { UserModule } from '@/modules/user/user.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordHasher } from './password-hasher.service';
import { RefreshTokenRepository } from './refresh-token.repository';
import { PasswordService } from './services/password.service';
import { RegistrationService } from './services/registration.service';
import { TokenService } from './services/token.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenCleanupService } from './token-cleanup.service';

@Module({
  imports: [
    PassportModule,
    JwtCoreModule,
    // Import module thay vì liệt kê MailService/UserService vào `providers`:
    // khai báo trong `providers` sẽ tạo instance riêng, đi vòng qua ranh giới
    // module và phụ thuộc ngầm vào việc MailerModule tình cờ là @Global.
    MailModule,
    UserModule,
    RoleModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    RegistrationService,
    PasswordService,
    PasswordHasher,
    RefreshTokenRepository,
    TokenCleanupService,
    JwtStrategy,
    // Chỉ đăng ký GoogleStrategy khi đã cấu hình Google OAuth — tránh
    // passport-google-oauth20 ném lỗi lúc khởi động khi thiếu clientID.
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
