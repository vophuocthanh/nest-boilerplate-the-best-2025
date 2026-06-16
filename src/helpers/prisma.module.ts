import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';

/**
 * Module global: chỉ tạo MỘT instance PrismaService (một connection pool) dùng chung
 * toàn app, tránh việc mỗi module tạo một PrismaClient riêng -> cạn connection (đặc biệt
 * với Postgres serverless như Neon).
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
