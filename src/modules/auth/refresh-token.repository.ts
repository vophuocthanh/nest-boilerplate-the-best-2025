import { Injectable } from '@nestjs/common';

import { RefreshToken } from '@prisma/client';

import { PrismaService } from '@/core/database/prisma.service';

/** Nơi DUY NHẤT truy vấn bảng `refresh_tokens` (aggregate do module auth sở hữu). */
@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({
      data: { tokenHash, userId, expiresAt },
    });
  }

  findByHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  revokeById(id: string): Promise<RefreshToken> {
    return this.prisma.refreshToken.update({
      where: { id },
      data: { revoked: true },
    });
  }

  revokeByHash(tokenHash: string): Promise<{ count: number }> {
    return this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revoked: true },
    });
  }

  /** Thu hồi toàn bộ phiên của một user (logout mọi thiết bị / phát hiện reuse). */
  revokeAllForUser(userId: string): Promise<{ count: number }> {
    return this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true },
    });
  }

  /** Dọn token đã hết hạn hoặc đã thu hồi để bảng không phình vô hạn. */
  purgeStale(): Promise<{ count: number }> {
    return this.prisma.refreshToken.deleteMany({
      where: { OR: [{ expiresAt: { lt: new Date() } }, { revoked: true }] },
    });
  }
}
