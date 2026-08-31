import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

/** Giới hạn dùng chung cho upload ảnh: chặn file quá lớn và mime không hợp lệ. */
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_MIME = /^image\/(png|jpe?g|webp|gif)$/;

export const imageUploadOptions: MulterOptions = {
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME.test(file.mimetype)) {
      return cb(
        new BadRequestException('Chỉ chấp nhận file ảnh (png, jpg, webp, gif)'),
        false,
      );
    }
    cb(null, true);
  },
};
