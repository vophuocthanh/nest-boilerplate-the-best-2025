import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { PrismaService } from '@app/src/helpers/prisma.service';
import { FileUploadService } from '@app/src/lib/file-upload.service';
import { AuthController } from '@app/src/modules/auth/auth.controller';
import { AuthService } from '@app/src/modules/auth/auth.service';
import { MailService } from '@app/src/modules/mail/mail.service';
import { UserModule } from '@app/src/modules/user/user.module';
import { UserService } from '@app/src/modules/user/user.service';

const EXPIRES_IN = '60m';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    UserModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>(process.env.JWT_SECRET),
        signOptions: { expiresIn: EXPIRES_IN },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PrismaService,
    UserService,
    FileUploadService,
    UserService,
    MailService,
  ],
})
export class AuthModule {}
