import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { User } from '@prisma/client';

import { randomInt } from 'crypto';

import { MailService } from '@/integrations/mail/mail.service';
import { DEFAULT_ROLE_NAME } from '@/modules/role/role.constants';
import { RoleRepository } from '@/modules/role/role.repository';
import { UserRepository } from '@/modules/user/user.repository';

import { hashToken, safeEqual } from '../auth.crypto';
import { RegisterDto } from '../dto/register.dto';
import { PasswordHasher } from '../password-hasher.service';

const CODE_LENGTH = 6;
const CODE_EXPIRATION_MINUTES = 5;

interface VerificationCode {
  code: string;
  expiresAt: Date;
}

/**
 * Đăng ký tài khoản & xác thực email: tạo user chưa verify, sinh + gửi mã xác
 * thực, kiểm tra mã, và gửi lại mã.
 */
@Injectable()
export class RegistrationService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly mailService: MailService,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async register(userData: RegisterDto): Promise<void> {
    await this.assertEmailAvailable(userData.email);
    this.assertPasswordsMatch(userData.password, userData.confirmPassword);

    const role = await this.getDefaultRole();
    const verification = this.generateVerificationCode();

    await this.userRepository.createUnverified({
      email: userData.email,
      name: userData.name,
      passwordHash: await this.passwordHasher.hash(userData.password),
      // Hash mã xác thực trước khi lưu để không lộ plaintext nếu DB bị compromise.
      verificationCodeHash: hashToken(verification.code),
      verificationCodeExpiresAt: verification.expiresAt,
      roleId: role.id,
    });

    await this.sendVerificationEmail(userData.email, verification.code);
  }

  async verifyEmail(email: string, code: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException({
        message: { email: 'Người dùng không tồn tại' },
      });
    }
    if (user.isVerified) {
      throw new BadRequestException({
        message: { email: 'Người dùng đã xác thực' },
      });
    }

    this.assertVerificationCodeValid(user, code);
    await this.userRepository.markVerified(email);
  }

  /**
   * Gửi lại mã xác thực. Luôn kết thúc im lặng dù email không tồn tại hay đã
   * verify — message thành công do `@ResponseMessage` ở controller quyết định,
   * nên response giống hệt nhau trong mọi trường hợp (chống account enumeration).
   */
  async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user || user.isVerified) {
      return;
    }

    const verification = this.generateVerificationCode();
    // Lưu HASH, giống lúc đăng ký. Trước đây nhánh này lưu code thô trong khi
    // verifyEmail so sánh với hash -> mã gửi lại không bao giờ verify được.
    await this.userRepository.setVerificationCode(
      user.id,
      hashToken(verification.code),
      verification.expiresAt,
    );
    await this.sendVerificationEmail(user.email, verification.code);
  }

  // --- Nội bộ ---------------------------------------------------------------

  private async assertEmailAvailable(email: string): Promise<void> {
    if (await this.userRepository.findByEmail(email)) {
      // Message chung chung để không tiết lộ email nào đã đăng ký.
      throw new BadRequestException({
        message: { email: 'Email không hợp lệ hoặc đã được đăng ký' },
      });
    }
  }

  private assertPasswordsMatch(
    password: string,
    confirmPassword: string,
  ): void {
    if (password !== confirmPassword) {
      throw new BadRequestException({
        message: {
          confirmPassword: 'Xác nhận mật khẩu không khớp với mật khẩu',
        },
      });
    }
  }

  private assertVerificationCodeValid(user: User, code: string): void {
    // So sánh hash của code nhập vào với hash đã lưu (constant-time).
    if (
      !user.verificationCode ||
      !safeEqual(user.verificationCode, hashToken(code))
    ) {
      throw new BadRequestException({
        message: { code: 'Mã xác thực không đúng' },
      });
    }
    if (
      !user.verificationCodeExpiresAt ||
      user.verificationCodeExpiresAt < new Date()
    ) {
      throw new BadRequestException({
        message: { code: 'Mã xác thực đã hết hạn' },
      });
    }
  }

  private async getDefaultRole() {
    const role = await this.roleRepository.findByName(DEFAULT_ROLE_NAME);
    if (!role) {
      // Fail-fast: DB chưa được seed role mặc định.
      throw new Error(
        `Default role "${DEFAULT_ROLE_NAME}" is missing. Run "pnpm seed".`,
      );
    }
    return role;
  }

  private generateVerificationCode(): VerificationCode {
    // randomInt (CSPRNG) thay cho Math.random để mã không đoán được.
    const code = String(randomInt(0, 10 ** CODE_LENGTH)).padStart(
      CODE_LENGTH,
      '0',
    );
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + CODE_EXPIRATION_MINUTES);
    return { code, expiresAt };
  }

  private async sendVerificationEmail(
    email: string,
    verificationCode: string,
  ): Promise<void> {
    await this.mailService.sendMail({
      to: email,
      subject: 'Xác nhận đăng ký tài khoản',
      template: 'verification-email',
      context: { verificationCode },
    });
  }
}
