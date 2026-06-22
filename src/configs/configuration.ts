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
