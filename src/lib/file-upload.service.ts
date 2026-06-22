import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

@Injectable()
export class FileUploadService {
  private readonly s3: S3Client;
  private readonly region: string;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('aws.region') ?? '';
    this.bucket = this.configService.get<string>('aws.bucket') ?? '';
    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('aws.accessKeyId') ?? '',
        secretAccessKey:
          this.configService.get<string>('aws.secretAccessKey') ?? '',
      },
    });
  }

  async uploadImageToS3(
    file: Express.Multer.File,
    folder: string,
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    try {
      const fileExtension = extname(file.originalname);
      const fileKey = `${folder}/${uuidv4()}${fileExtension}`;
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: fileKey,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
      return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${fileKey}`;
    } catch (error) {
      throw new InternalServerErrorException('Error uploading file to S3');
    }
  }
}
