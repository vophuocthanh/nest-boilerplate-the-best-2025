import { User } from '@prisma/client';

/** Payload được ký trong JWT access/refresh token */
export interface JwtPayload {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

/** Cặp token trả về khi đăng nhập */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** Thông tin user an toàn để trả về client (không có password) */
export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

/** Kết quả đăng nhập: token + user */
export interface AuthResult extends AuthTokens {
  user: SafeUser;
}

/** User kèm quan hệ role đã include */
export type UserWithRole = User & { role: { name: string } };
