import { Module } from '@nestjs/common';

import { S3StorageService } from './s3-storage.service';
import { StorageService } from './storage.service';

/**
 * Cung cấp MỘT instance StorageService dùng chung.
 *
 * Trước đây `FileUploadService` được liệt kê trong `providers` của cả UserModule
 * lẫn UploadModule — mỗi khai báo là một instance riêng, tức hai `S3Client` với
 * hai connection pool song song.
 */
@Module({
  providers: [{ provide: StorageService, useClass: S3StorageService }],
  exports: [StorageService],
})
export class StorageModule {}
