import { createHash, timingSafeEqual } from 'crypto';

/**
 * Hash token (SHA-256) trước khi lưu DB — tra cứu được mà không cần giữ token thô.
 * Dùng cho refresh token, reset token và mã xác thực email.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** So sánh chuỗi theo thời gian hằng số để tránh timing attack. */
export function safeEqual(a: string, b: string): boolean {
  // Uint8Array.from cho ArrayBuffer backing tường minh (hợp với @types/node mới).
  const bufA = Uint8Array.from(Buffer.from(a));
  const bufB = Uint8Array.from(Buffer.from(b));
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
