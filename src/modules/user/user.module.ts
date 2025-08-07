import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '@app/src/helpers/prisma.service';
import { FileUploadService } from '@app/src/lib/file-upload.service';
import { UserController } from '@app/src/modules/user/user.controller';
import { UserService } from '@app/src/modules/user/user.service';

@Module({
  controllers: [UserController],
  providers: [UserService, PrismaService, JwtService, FileUploadService],
})
export class UserModule {}
