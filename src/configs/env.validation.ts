import * as Joi from 'joi';

/**
 * Schema validate biến môi trường khi app khởi động.
 * Thiếu biến bắt buộc -> app fail-fast ngay, tránh lỗi mơ hồ lúc runtime.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(4040),

  // Database
  DATABASE_URL: Joi.string().required(),

  // JWT
  ACCESS_TOKEN_KEY: Joi.string().required(),
  REFRESH_TOKEN_KEY: Joi.string().required(),
  ACCESS_TOKEN_EXPIRES_IN: Joi.string().default('1d'),
  REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('7d'),

  // Security (tuỳ chọn — có default an toàn)
  BCRYPT_SALT_ROUNDS: Joi.number().min(10).max(15).default(12),
  MAX_FAILED_LOGIN_ATTEMPTS: Joi.number().default(5),
  ACCOUNT_LOCK_MINUTES: Joi.number().default(15),

  // CORS (chỉ bắt buộc cấu hình ở production thông qua logic ở main.ts)
  CORS_ORIGIN: Joi.string().allow('').optional(),

  // AWS S3 (tuỳ chọn — chỉ cần khi dùng upload)
  AWS_REGION: Joi.string().optional(),
  AWS_ACCESS_KEY_ID: Joi.string().optional(),
  AWS_SECRET_ACCESS_KEY: Joi.string().optional(),
  AWS_S3_BUCKET_NAME: Joi.string().optional(),

  // Mail (tuỳ chọn)
  MAIL_TRANSPORT: Joi.string().optional(),
  MAIL_FROM: Joi.string().optional(),
  MAIL_HOST: Joi.string().optional(),
  MAIL_PORT: Joi.number().port().optional(),
  MAIL_SECURE: Joi.boolean().optional(),
  MAIL_USER: Joi.string().optional(),
  MAIL_PASSWORD: Joi.string().optional(),

  // Google OAuth (tuỳ chọn)
  GOOGLE_CLIENT_ID: Joi.string().optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().optional(),
  GOOGLE_CALLBACK_URL: Joi.string().optional(),

  URL_RESET_PASSWORD: Joi.string().optional(),
})
  // Cho phép các biến khác không khai báo trong schema
  .unknown(true);
