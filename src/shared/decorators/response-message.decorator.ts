import { SetMetadata } from '@nestjs/common';

export const RESPONSE_MESSAGE_KEY = 'response:message';

/**
 * Khai báo `message` cho response thành công của một route.
 *
 * Nhờ decorator này, service chỉ cần trả DỮ LIỆU THÔ — không phải tự bọc
 * `{ data, message, status }` nữa. Envelope được tạo tại một nơi duy nhất
 * là `TransformInterceptor`.
 */
export const ResponseMessage = (message: string) =>
  SetMetadata(RESPONSE_MESSAGE_KEY, message);
