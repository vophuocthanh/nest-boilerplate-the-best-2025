import { Injectable } from '@nestjs/common';

import { IMAGE_FOLDER } from '@/integrations/storage/storage.constants';
import { StorageService } from '@/integrations/storage/storage.service';

@Injectable()
export class UploadService {
  constructor(private readonly storageService: StorageService) {}

  uploadSingleFile(file: Express.Multer.File): Promise<string> {
    return this.storageService.upload(file, IMAGE_FOLDER);
  }

  uploadMultipleFiles(files: Express.Multer.File[]): Promise<string[]> {
    return Promise.all(
      files.map((file) => this.storageService.upload(file, IMAGE_FOLDER)),
    );
  }
}
