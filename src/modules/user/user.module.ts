import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FileUploadService } from 'src/lib/file-upload.service';
import { PrismaService } from 'src/prisma.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { GoogleStrategy } from '@app/src/modules/auth/google.strategy';

@Module({
  controllers: [UserController],
  providers: [
    UserService,
    PrismaService,
    JwtService,
    FileUploadService,
    GoogleStrategy,
  ],
})
export class UserModule {}
