import { Injectable } from '@nestjs/common';

import { IMAGE_FOLDER } from '@app/src/configs/const';

import { FileUploadService } from '../../lib/file-upload.service';

@Injectable()
export class UploadService {
  constructor(private readonly fileUploadService: FileUploadService) {}

  async uploadSingleFile(file: Express.Multer.File): Promise<string> {
    return this.fileUploadService.uploadImageToS3(file, IMAGE_FOLDER);
  }

  async uploadMultipleFiles(files: Express.Multer.File[]): Promise<string[]> {
    const uploadPromises = files.map((file) =>
      this.fileUploadService.uploadImageToS3(file, IMAGE_FOLDER),
    );
    return Promise.all(uploadPromises);
  }
}
