import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { randomBytes } from 'crypto';

import { MailService } from '@/integrations/mail/mail.service';
import { UserRepository } from '@/modules/user/user.repository';

import { hashToken } from '../auth.crypto';
import { ForgotPasswordDto } from '../dto/auth.dto';
import { PasswordHasher } from '../password-hasher.service';
import { RefreshTokenRepository } from '../refresh-token.repository';

const RESET_TOKEN_TTL_MINUTES = 60;
const RESET_TOKEN_BYTES = 32;

/**
 * Quản lý mật khẩu: quên mật khẩu (gửi reset token), đặt lại mật khẩu bằng
 * token dùng một lần, và đổi mật khẩu khi đã đăng nhập.
 */
@Injectable()
export class PasswordService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly mailService: MailService,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  /**
   * Luôn kết thúc im lặng dù email có tồn tại hay không — response giống hệt
   * nhau trong mọi trường hợp (chống account enumeration).
   */
  async forgotPassword({ email }: ForgotPasswordDto): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return;
    }

    const resetToken = randomBytes(RESET_TOKEN_BYTES).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + RESET_TOKEN_TTL_MINUTES);

    await this.userRepository.setResetToken(
      user.id,
      hashToken(resetToken),
      expiresAt,
    );

    // Email mang token thô; FE ghép với URL_RESET_PASSWORD để tạo link đặt lại.
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
  ): Promise<void> {
    this.assertPasswordsMatch(newPassword, confirmPassword);

    const user = await this.userRepository.findByResetTokenHash(
      hashToken(token),
    );
    if (
      !user ||
      !user.resetTokenExpiresAt ||
      user.resetTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException({
        message: { token: 'Reset token is invalid or has expired' },
      });
    }

    if (user.password) {
      await this.assertPasswordIsNew(newPassword, user.password);
    }

    await this.userRepository.updatePasswordAndClearResetToken(
      user.id,
      await this.passwordHasher.hash(newPassword),
    );
    // Thu hồi mọi refresh token -> buộc đăng nhập lại trên mọi thiết bị.
    await this.refreshTokenRepository.revokeAllForUser(user.id);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<void> {
    const record = await this.userRepository.findPasswordById(userId);
    if (!record) {
      throw new NotFoundException({ message: { user: 'User not found' } });
    }
    if (!record.password) {
      throw new BadRequestException({
        message: 'Google account cannot change password this way',
      });
    }

    const isCurrentCorrect = await this.passwordHasher.compare(
      currentPassword,
      record.password,
    );
    if (!isCurrentCorrect) {
      throw new BadRequestException({
        message: { password: 'Current password is incorrect' },
      });
    }

    this.assertPasswordsMatch(newPassword, confirmPassword);
    await this.assertPasswordIsNew(newPassword, record.password);

    await this.userRepository.updatePassword(
      userId,
      await this.passwordHasher.hash(newPassword),
    );
  }

  // --- Nội bộ ---------------------------------------------------------------

  private assertPasswordsMatch(
    newPassword: string,
    confirmPassword: string,
  ): void {
    if (newPassword !== confirmPassword) {
      throw new BadRequestException({
        message: {
          confirmPassword: 'Password and confirm password do not match',
        },
      });
    }
  }

  private async assertPasswordIsNew(
    newPassword: string,
    currentPasswordHash: string,
  ): Promise<void> {
    const isSame = await this.passwordHasher.compare(
      newPassword,
      currentPasswordHash,
    );
    if (isSame) {
      throw new BadRequestException({
        message: {
          password: 'New password cannot be the same as the old password',
        },
      });
    }
  }
}
