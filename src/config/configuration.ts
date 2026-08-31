import { registerAs } from '@nestjs/config';

/**
 * Config có namespace, truy cập qua ConfigService (vd: config.get('jwt.accessSecret')).
 * Tập trung mọi biến môi trường nhạy cảm về một nơi, không đọc process.env rải rác.
 */
export const jwtConfig = registerAs('jwt', () => ({
  accessSecret: process.env.ACCESS_TOKEN_KEY,
  refreshSecret: process.env.REFRESH_TOKEN_KEY,
  accessExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN ?? '1d',
  refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7d',
}));

export const awsConfig = registerAs('aws', () => ({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  bucket: process.env.AWS_S3_BUCKET_NAME,
}));

export const googleConfig = registerAs('google', () => ({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackUrl: process.env.GOOGLE_CALLBACK_URL,
}));

export const securityConfig = registerAs('security', () => ({
  // Cost factor cho bcrypt. Mặc định 12 (an toàn cho 2026), có thể chỉnh qua env.
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 12,
  // Khoá tài khoản tạm thời sau N lần đăng nhập sai liên tiếp.
  maxFailedLoginAttempts: Number(process.env.MAX_FAILED_LOGIN_ATTEMPTS) || 5,
  accountLockMinutes: Number(process.env.ACCOUNT_LOCK_MINUTES) || 15,
}));
