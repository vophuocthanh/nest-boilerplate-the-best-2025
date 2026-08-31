import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/**
 * Origin được phép truy cập.
 * - Production: chỉ cho phép origin khai báo trong CORS_ORIGIN (ngăn cách bằng dấu phẩy).
 * - Dev: cho phép tất cả để tiện debug.
 */
export function getCorsOrigin(): boolean | string[] {
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    return true;
  }
  const whitelist = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return whitelist.length ? whitelist : false;
}

/** Cấu hình CORS đầy đủ cho HTTP (main.ts). */
export function buildCorsOptions(): CorsOptions {
  return {
    origin: getCorsOrigin(),
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
  };
}
