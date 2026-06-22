import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { FileUploadService } from '@app/src/lib/file-upload.service';
import { AuthController } from '@app/src/modules/auth/auth.controller';
import { AuthService } from '@app/src/modules/auth/auth.service';
import { JwtStrategy } from '@app/src/modules/auth/strategies/jwt.strategy';
import { MailService } from '@app/src/modules/mail/mail.service';
import { UserModule } from '@app/src/modules/user/user.module';
import { UserService } from '@app/src/modules/user/user.service';

@Module({
  imports: [
    UserModule,
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
    JwtStrategy,
    UserService,
    FileUploadService,
    MailService,
  ],
})
export class AuthModule {}
