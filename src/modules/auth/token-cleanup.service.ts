import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { RefreshTokenRepository } from './refresh-token.repository';

/**
 * Dọn refresh token đã hết hạn hoặc đã bị thu hồi để bảng không phình vô hạn.
 * Chạy mỗi ngày lúc 3h sáng.
 */
@Injectable()
export class TokenCleanupService {
  private readonly logger = new Logger(TokenCleanupService.name);

  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeStaleRefreshTokens(): Promise<void> {
    const { count } = await this.refreshTokenRepository.purgeStale();
    if (count > 0) {
      this.logger.log(`Purged ${count} stale refresh token(s)`);
    }
  }
}
