import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '@app/src/prisma/prisma.service';

import { hashToken } from '../auth.helpers';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { AuthTokens, JwtPayload, UserWithRole } from '../types/auth.types';

/**
 * Manages the token lifecycle: signing access/refresh tokens, persisting the
 * hashed refresh token (rotation), refresh with reuse-detection, and logout.
 */
@Injectable()
export class TokenService {
  private static readonly REFRESH_TOKEN_TTL_DAYS = 7;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /** Sign an access/refresh token pair and store the hashed refresh token to support rotation */
  async generateTokens(user: UserWithRole): Promise<AuthTokens> {
    const payload: JwtPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
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
    await this.persistRefreshToken(user.id, refreshToken);
    return { accessToken, refreshToken };
  }

  /** Store the hash of the refresh token in the DB to support rotation + revoke */
  private async persistRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() + TokenService.REFRESH_TOKEN_TTL_DAYS,
    );
    await this.prismaService.refreshToken.create({
      data: {
        tokenHash: hashToken(refreshToken),
        userId,
        expiresAt,
      },
    });
  }

  /**
   * Refresh token rotation:
   * - Verify the signature + match the hash in the DB (guards against revoked/forged tokens)
   * - Reuse-detection: a revoked token used again -> revoke the user's entire session set
   * - Revoke the old token, then issue a new pair
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthTokens> {
    let decoded: JwtPayload;
    try {
      decoded = this.jwtService.verify(refreshTokenDto.refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = hashToken(refreshTokenDto.refreshToken);
    const stored = await this.prismaService.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException(
        'Refresh token is invalid or has been revoked',
      );
    }

    // Reuse-detection: the token was already revoked (rotated) but is being used
    // again -> likely stolen. Revoke ALL of the user's refresh tokens.
    if (stored.revoked) {
      await this.prismaService.refreshToken.updateMany({
        where: { userId: stored.userId },
        data: { revoked: true },
      });
      throw new UnauthorizedException(
        'Refresh token reuse detected; all sessions have been revoked',
      );
    }

    // Rotation: revoke the old token before issuing a new one
    await this.prismaService.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    const user = await this.prismaService.user.findUnique({
      where: { id: decoded.id },
      include: { role: true },
    });
    if (!user || !user.role) {
      throw new UnauthorizedException('User not found');
    }

    return this.generateTokens(user as UserWithRole);
  }

  /** Log out: revoke the current refresh token */
  async logout(refreshToken: string): Promise<{ message: string }> {
    await this.prismaService.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken) },
      data: { revoked: true },
    });
    return { message: 'Logged out successfully' };
  }
}
