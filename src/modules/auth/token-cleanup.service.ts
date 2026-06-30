import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PrismaService } from '@app/src/prisma/prisma.service';

/**
 * Dọn refresh token đã hết hạn hoặc đã bị thu hồi để bảng không phình vô hạn.
 * Chạy mỗi ngày lúc 3h sáng.
 */
@Injectable()
export class TokenCleanupService {
  private readonly logger = new Logger(TokenCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeStaleRefreshTokens(): Promise<void> {
    const { count } = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { revoked: true }],
      },
    });
    if (count > 0) {
      this.logger.log(`Purged ${count} stale refresh token(s)`);
    }
  }
}
