import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { FileUploadService } from '../../lib/file-upload.service';

@Module({
  controllers: [UploadController],
  providers: [UploadService, FileUploadService],
  exports: [UploadService],
})
export class UploadModule {}
