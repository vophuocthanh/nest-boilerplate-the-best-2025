import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { UserRepository, UserWithRole } from '@/modules/user/user.repository';

import { hashToken } from '../auth.crypto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { RefreshTokenRepository } from '../refresh-token.repository';
import { AuthTokens, JwtPayload } from '../types/auth.types';

const REFRESH_TOKEN_TTL_DAYS = 7;

/**
 * Vòng đời token: ký cặp access/refresh, lưu hash của refresh token (rotation),
 * refresh kèm reuse-detection, và logout.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  /** Ký cặp access/refresh và lưu hash refresh token để hỗ trợ rotation. */
  async generateTokens(user: UserWithRole): Promise<AuthTokens> {
    const payload: JwtPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role?.name,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: this.configService.get<string>('jwt.accessExpiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
      }),
    ]);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);
    await this.refreshTokenRepository.create(
      user.id,
      hashToken(refreshToken),
      expiresAt,
    );

    return { accessToken, refreshToken };
  }

  /**
   * Refresh token rotation:
   * - Verify chữ ký + đối chiếu hash trong DB (chặn token đã thu hồi/giả mạo).
   * - Reuse-detection: token đã thu hồi mà bị dùng lại -> thu hồi toàn bộ phiên.
   * - Thu hồi token cũ rồi cấp cặp mới.
   */
  async refreshToken({ refreshToken }: RefreshTokenDto): Promise<AuthTokens> {
    const decoded = this.verifyRefreshToken(refreshToken);
    const stored = await this.refreshTokenRepository.findByHash(
      hashToken(refreshToken),
    );

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException(
        'Refresh token is invalid or has been revoked',
      );
    }

    if (stored.revoked) {
      // Token đã rotate nhưng bị dùng lại -> nhiều khả năng bị đánh cắp.
      await this.refreshTokenRepository.revokeAllForUser(stored.userId);
      throw new UnauthorizedException(
        'Refresh token reuse detected; all sessions have been revoked',
      );
    }

    await this.refreshTokenRepository.revokeById(stored.id);

    const user = await this.userRepository.findByIdWithRole(decoded.id);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.generateTokens(user);
  }

  private verifyRefreshToken(refreshToken: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /** Đăng xuất: thu hồi refresh token hiện tại. */
  async logout(refreshToken: string): Promise<void> {
    await this.refreshTokenRepository.revokeByHash(hashToken(refreshToken));
  }
}
