import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { User } from '@prisma/client';

import { compare, hash } from 'bcrypt';
import { randomBytes } from 'crypto';

import { MailService } from '@app/src/modules/mail/mail.service';
import { PrismaService } from '@app/src/prisma/prisma.service';

import { hashToken, resolveBcryptRounds } from '../auth.helpers';
import { ForgotPasswordDto } from '../dto/auth.dto';

/**
 * Password management: forgot password (send a reset token), reset password
 * (one-time token), and change password while authenticated.
 */
@Injectable()
export class PasswordService {
  private static readonly RESET_TOKEN_TTL_MINUTES = 60;

  private readonly bcryptRounds: number;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {
    this.bcryptRounds = resolveBcryptRounds(
      this.configService.get<number>('security.bcryptSaltRounds'),
    );
  }

  async forgotPassword(data: ForgotPasswordDto): Promise<{ message: string }> {
    const genericMessage = {
      message: 'If the email exists, reset instructions have been sent.',
    };

    const user = await this.prismaService.user.findUnique({
      where: { email: data.email },
    });
    // Always return a generic message so we don't reveal which emails are registered.
    if (!user) {
      return genericMessage;
    }

    // Random reset token, single-use, expires after RESET_TOKEN_TTL_MINUTES
    const resetToken = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + PasswordService.RESET_TOKEN_TTL_MINUTES,
    );

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashToken(resetToken),
        resetTokenExpiresAt: expiresAt,
      },
    });

    // The email carries the raw token; the FE combines it with URL_RESET_PASSWORD to build the reset link
    await this.sendResetPasswordEmail(data.email, resetToken);
    return genericMessage;
  }

  private async sendResetPasswordEmail(
    email: string,
    resetToken: string,
  ): Promise<void> {
    await this.mailService.sendMail({
      to: email,
      subject: 'Reset mật khẩu',
      template: 'reset-password',
      context: { resetToken },
    });
  }

  async resetPassword(
    token: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<{ message: string }> {
    if (newPassword !== confirmPassword) {
      throw new HttpException(
        {
          message: {
            confirmPassword: 'Password and confirm password do not match',
          },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = await this.prismaService.user.findFirst({
      where: { resetToken: hashToken(token) },
    });
    if (
      !user ||
      !user.resetTokenExpiresAt ||
      user.resetTokenExpiresAt < new Date()
    ) {
      throw new HttpException(
        { message: { token: 'Reset token is invalid or has expired' } },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (user.password) {
      await this.validateNewPassword(newPassword, user.password);
    }

    const hashedPassword = await hash(newPassword, this.bcryptRounds);
    await this.prismaService.user.update({
      where: { id: user.id },
      // Clear the token after use (one-time)
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    });

    // Revoke all existing refresh tokens -> force re-login on every device
    await this.prismaService.refreshToken.updateMany({
      where: { userId: user.id },
      data: { revoked: true },
    });

    return { message: 'Password reset successfully' };
  }

  private async getUserPassword(
    userId: string,
  ): Promise<{ password: string | null }> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });
    if (!user) {
      throw new HttpException(
        { message: { user: 'User not found' } },
        HttpStatus.NOT_FOUND,
      );
    }
    return user;
  }

  private async validateNewPassword(
    newPassword: string,
    currentPassword: string,
  ): Promise<void> {
    const isSamePassword = await compare(newPassword, currentPassword);
    if (isSamePassword) {
      throw new HttpException(
        {
          message: {
            password: 'New password cannot be the same as the old password',
          },
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async updateUserPassword(
    userId: string,
    newPassword: string,
  ): Promise<void> {
    const hashedPassword = await hash(newPassword, this.bcryptRounds);
    await this.prismaService.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  async changePassword(
    user: User,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<{ message: string }> {
    const userRecord = await this.getUserPassword(user.id);
    if (!userRecord.password) {
      throw new HttpException(
        { message: 'Google account cannot change password this way' },
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.validateCurrentPassword(currentPassword, userRecord.password);
    await this.validatePasswordChange(
      currentPassword,
      newPassword,
      confirmPassword,
    );
    await this.updateUserPassword(user.id, newPassword);
    return { message: 'Password changed successfully' };
  }

  private async validateCurrentPassword(
    currentPassword: string,
    storedPassword: string,
  ): Promise<void> {
    const isCurrentPasswordCorrect = await compare(
      currentPassword,
      storedPassword,
    );
    if (!isCurrentPasswordCorrect) {
      throw new HttpException(
        { message: { password: 'Current password is incorrect' } },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async validatePasswordChange(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<void> {
    if (currentPassword === newPassword) {
      throw new HttpException(
        {
          message: {
            password: 'New password cannot be the same as the current password',
          },
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (newPassword !== confirmPassword) {
      throw new HttpException(
        {
          message: {
            confirmPassword: 'New password and confirm password do not match',
          },
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
