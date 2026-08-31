/** Payload được ký trong JWT access/refresh token. */
export interface JwtPayload {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

/** Cặp token trả về khi đăng nhập. */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** Thông tin user an toàn kèm trong kết quả đăng nhập (không có password). */
export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: string | null;
}

/** Kết quả đăng nhập: token + user. */
export interface AuthResult extends AuthTokens {
  user: SafeUser;
}

/** Hồ sơ Google trả về sau khi xác thực OAuth. */
export interface GoogleProfile {
  email: string;
  name: string;
  googleId: string;
}
