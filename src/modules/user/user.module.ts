import { Module } from '@nestjs/common';

import { FileUploadService } from '@app/src/lib/file-upload.service';
import { UserController } from '@app/src/modules/user/user.controller';
import { UserService } from '@app/src/modules/user/user.service';

@Module({
  controllers: [UserController],
  providers: [UserService, FileUploadService],
})
export class UserModule {}
