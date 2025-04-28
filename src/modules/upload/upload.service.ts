import { Injectable } from '@nestjs/common';
import { FileUploadService } from '../../lib/file-upload.service';

@Injectable()
export class UploadService {
  constructor(private readonly fileUploadService: FileUploadService) {}

  async uploadSingleFile(file: Express.Multer.File): Promise<string> {
    return this.fileUploadService.uploadImageToS3(file, 'images');
  }

  async uploadMultipleFiles(files: Express.Multer.File[]): Promise<string[]> {
    const uploadPromises = files.map((file) =>
      this.fileUploadService.uploadImageToS3(file, 'images'),
    );
    return Promise.all(uploadPromises);
  }
}
