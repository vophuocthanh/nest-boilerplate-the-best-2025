import { Module } from '@nestjs/common';

import { FileUploadService } from '@app/src/lib/file-upload.service';
import { UploadController } from '@app/src/modules/upload/upload.controller';
import { UploadService } from '@app/src/modules/upload/upload.service';

@Module({
  controllers: [UploadController],
  providers: [UploadService, FileUploadService],
  exports: [UploadService],
})
export class UploadModule {}
