import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { User } from '@prisma/client';

import { hash } from 'bcrypt';
import { randomInt } from 'crypto';

import { MailService } from '@app/src/modules/mail/mail.service';
import { PrismaService } from '@app/src/prisma/prisma.service';

import {
  getDefaultRole,
  resolveBcryptRounds,
  safeEqual,
} from '../auth.helpers';
import { RegisterDto } from '../dto/register.dto';
import { SendVerificationEmailDto } from '../dto/verify-code';

/**
 * Account registration & email verification: create an unverified user, generate
 * and send the verification code, validate the code, and resend it.
 */
@Injectable()
export class RegistrationService {
  private static readonly CODE_LENGTH = 6;
  private static readonly EXPIRATION_MINUTES = 5;

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

  private generateVerificationCode(): { code: string; expiresAt: Date } {
    // randomInt (CSPRNG) instead of Math.random so the code is not guessable
    const max = 10 ** RegistrationService.CODE_LENGTH;
    const code = String(randomInt(0, max)).padStart(
      RegistrationService.CODE_LENGTH,
      '0',
    );
    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + RegistrationService.EXPIRATION_MINUTES,
    );
    return { code, expiresAt };
  }

  async sendVerificationEmail({
    email,
    verificationCode,
  }: SendVerificationEmailDto) {
    await this.mailService.sendMail({
      to: email,
      subject: 'Xác nhận đăng ký tài khoản',
      template: 'verification-email',
      context: { verificationCode },
    });
  }

  async register(userData: RegisterDto): Promise<{ message: string }> {
    await this.validateRegistration(userData);
    const hashedPassword = await hash(userData.password, this.bcryptRounds);
    const verificationData = this.generateVerificationCode();
    const defaultRole = await getDefaultRole(this.prismaService);

    await this.createUnverifiedUser(
      userData,
      hashedPassword,
      verificationData,
      defaultRole.id,
    );
    await this.sendVerificationEmail({
      email: userData.email,
      verificationCode: verificationData.code,
    });
    return { message: 'Vui lòng kiểm tra email để xác nhận đăng ký' };
  }

  private async validateRegistration(userData: RegisterDto): Promise<void> {
    const existingUser = await this.prismaService.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      throw new HttpException(
        { message: { email: 'Email đã được sử dụng' } },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!userData.password) {
      throw new HttpException(
        { message: { password: 'Mật khẩu không được để trống' } },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!userData.confirmPassword) {
      throw new HttpException(
        {
          message: { confirmPassword: 'Xác nhận mật khẩu không được để trống' },
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (userData.password !== userData.confirmPassword) {
      throw new HttpException(
        {
          message: {
            confirmPassword: 'Xác nhận mật khẩu không khớp với mật khẩu',
          },
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async createUnverifiedUser(
    userData: RegisterDto,
    hashedPassword: string,
    verificationData: { code: string; expiresAt: Date },
    roleId: string,
  ): Promise<void> {
    await this.prismaService.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        verificationCode: verificationData.code,
        verificationCodeExpiresAt: verificationData.expiresAt,
        isVerified: false,
        role: { connect: { id: roleId } },
      },
    });
  }

  async verifyEmail(email: string, code: string): Promise<{ message: string }> {
    const user = await this.findUserForVerification(email);
    await this.validateVerificationCode(user, code);
    await this.markUserAsVerified(email);
    return { message: 'Đăng ký thành công!' };
  }

  private async findUserForVerification(email: string): Promise<User> {
    const user = await this.prismaService.user.findUnique({ where: { email } });
    if (!user) {
      throw new HttpException(
        { message: { email: 'Người dùng không tồn tại' } },
        HttpStatus.NOT_FOUND,
      );
    }
    if (user.isVerified) {
      throw new HttpException(
        { message: { email: 'Người dùng đã xác thực' } },
        HttpStatus.BAD_REQUEST,
      );
    }
    return user;
  }

  private async validateVerificationCode(
    user: User,
    code: string,
  ): Promise<void> {
    if (!user.verificationCode || !safeEqual(user.verificationCode, code)) {
      throw new HttpException(
        { message: { code: 'Mã xác thực không đúng' } },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (new Date() > user.verificationCodeExpiresAt!) {
      throw new HttpException(
        { message: { code: 'Mã xác thực đã hết hạn' } },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async markUserAsVerified(email: string): Promise<void> {
    await this.prismaService.user.update({
      where: { email },
      data: {
        isVerified: true,
        verificationCode: null,
        verificationCodeExpiresAt: null,
      },
    });
  }

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    // Always return a generic message so we don't reveal which emails are registered.
    const genericMessage = {
      message:
        'Nếu email tồn tại và chưa xác thực, mã xác thực mới đã được gửi',
    };

    const user = await this.prismaService.user.findUnique({ where: { email } });
    if (!user || user.isVerified) {
      return genericMessage;
    }

    const verificationData = this.generateVerificationCode();
    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        verificationCode: verificationData.code,
        verificationCodeExpiresAt: verificationData.expiresAt,
      },
    });
    await this.sendVerificationEmail({
      email: user.email,
      verificationCode: verificationData.code,
    });

    return genericMessage;
  }
}
