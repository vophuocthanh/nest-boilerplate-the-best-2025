import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { User } from '@prisma/client';

import { compare, hash } from 'bcrypt';
import { createHash, randomBytes, randomInt } from 'crypto';

import { PrismaService } from '@app/src/helpers/prisma.service';
import { ForgotPasswordDto } from '@app/src/modules/auth/dto/auth.dto';
import { RefreshTokenDto } from '@app/src/modules/auth/dto/refresh-token.dto';
import { RegisterDto } from '@app/src/modules/auth/dto/register.dto';
import { SendVerificationEmailDto } from '@app/src/modules/auth/dto/verify-code';
import {
  AuthResult,
  AuthTokens,
  JwtPayload,
  SafeUser,
  UserWithRole,
} from '@app/src/modules/auth/types/auth.types';
import { MailService } from '@app/src/modules/mail/mail.service';

@Injectable()
export class AuthService {
  private static readonly CODE_LENGTH = 6;
  private static readonly EXPIRATION_MINUTES = 5;
  private static readonly DEFAULT_ROLE = 'USER';
  private static readonly BCRYPT_SALT_ROUNDS = 10;
  private static readonly REFRESH_TOKEN_TTL_DAYS = 7;
  private static readonly RESET_TOKEN_TTL_MINUTES = 60;

  /** Hash token (SHA-256) trước khi lưu DB để có thể tra cứu chính xác mà không lưu token thô */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
    private configService: ConfigService,
  ) {}

  private generateVerificationCode(): { code: string; expiresAt: Date } {
    // randomInt (CSPRNG) thay cho Math.random để mã xác thực không đoán được
    const max = 10 ** AuthService.CODE_LENGTH;
    const code = String(randomInt(0, max)).padStart(
      AuthService.CODE_LENGTH,
      '0',
    );
    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + AuthService.EXPIRATION_MINUTES,
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
      context: {
        verificationCode,
      },
    });
  }

  async register(userData: RegisterDto): Promise<{ message: string }> {
    await this.validateRegistration(userData);
    const hashedPassword = await hash(
      userData.password,
      AuthService.BCRYPT_SALT_ROUNDS,
    );
    const verificationData = this.generateVerificationCode();
    const defaultRole = await this.getDefaultRole();

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

    // Password validation
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

  private async getDefaultRole() {
    const defaultRole = await this.prismaService.role.findUnique({
      where: { name: AuthService.DEFAULT_ROLE },
    });

    if (!defaultRole) {
      throw new HttpException(
        { message: { role: 'Không tìm thấy vai trò mặc định' } },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return defaultRole;
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
    if (user.verificationCode !== code) {
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

  async login(credentials: {
    email: string;
    password: string;
  }): Promise<AuthResult> {
    const user = await this.findAndValidateUser(credentials);
    const tokens = await this.generateTokens(user);
    return { ...tokens, user: this.formatUserResponse(user) };
  }

  private async findAndValidateUser(credentials: {
    email: string;
    password: string;
  }): Promise<UserWithRole> {
    // Thông báo chung cho cả "email không tồn tại" lẫn "sai mật khẩu"
    // -> tránh lộ email nào đã đăng ký (account enumeration).
    const invalidCredentials = new UnauthorizedException({
      message: { credentials: 'Email hoặc mật khẩu không đúng' },
    });

    const user = await this.prismaService.user.findUnique({
      where: { email: credentials.email },
      include: { role: true },
    });

    if (!user || !user.password) {
      throw invalidCredentials;
    }

    const isPasswordValid = await compare(credentials.password, user.password);
    if (!isPasswordValid) {
      throw invalidCredentials;
    }

    if (!user.isVerified) {
      throw new HttpException(
        { message: { account: 'Account is not verified' } },
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (!user.role) {
      throw new HttpException(
        { message: { role: 'User role not assigned' } },
        HttpStatus.FORBIDDEN,
      );
    }
    // role đã được đảm bảo non-null qua check phía trên
    return user as UserWithRole;
  }

  private async generateTokens(user: UserWithRole): Promise<AuthTokens> {
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

  /** Lưu hash của refresh token vào DB để hỗ trợ rotation + revoke */
  private async persistRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + AuthService.REFRESH_TOKEN_TTL_DAYS);
    await this.prismaService.refreshToken.create({
      data: {
        tokenHash: this.hashToken(refreshToken),
        userId,
        expiresAt,
      },
    });
  }

  private formatUserResponse(user: UserWithRole): SafeUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
    };
  }

  async forgotPassword(data: ForgotPasswordDto): Promise<{ message: string }> {
    const genericMessage = {
      message: 'If the email exists, reset instructions have been sent.',
    };

    const user = await this.prismaService.user.findUnique({
      where: { email: data.email },
    });
    // Luôn trả về thông báo chung để không lộ email nào đã đăng ký.
    if (!user) {
      return genericMessage;
    }

    // Token reset ngẫu nhiên, dùng 1 lần, hết hạn sau RESET_TOKEN_TTL_MINUTES
    const resetToken = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + AuthService.RESET_TOKEN_TTL_MINUTES,
    );

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        resetToken: this.hashToken(resetToken),
        resetTokenExpiresAt: expiresAt,
      },
    });

    // Email gửi token thô; FE ghép với URL_RESET_PASSWORD để tạo link reset
    await this.sendResetPasswordEmail(data.email, resetToken);
    return genericMessage;
  }

  private async sendResetPasswordEmail(
    email: string,
    accessToken: string,
  ): Promise<void> {
    await this.mailService.sendMail({
      to: email,
      subject: 'Reset mật khẩu',
      template: 'reset-password',
      context: {
        resetToken: accessToken,
      },
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
      where: { resetToken: this.hashToken(token) },
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

    const hashedPassword = await hash(
      newPassword,
      AuthService.BCRYPT_SALT_ROUNDS,
    );
    await this.prismaService.user.update({
      where: { id: user.id },
      // Xoá token sau khi dùng (one-time)
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    });

    // Thu hồi mọi refresh token cũ -> buộc đăng nhập lại trên mọi thiết bị
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
    const hashedPassword = await hash(
      newPassword,
      AuthService.BCRYPT_SALT_ROUNDS,
    );
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

  /**
   * Refresh token rotation:
   * - Verify chữ ký + đối chiếu hash trong DB (chống token bị thu hồi/giả mạo)
   * - Thu hồi token cũ, cấp cặp token mới (mỗi lần refresh ra refresh token mới)
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthTokens> {
    let decoded: JwtPayload;
    try {
      decoded = this.jwtService.verify(refreshTokenDto.refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = this.hashToken(refreshTokenDto.refreshToken);
    const stored = await this.prismaService.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException(
        'Refresh token is invalid or has been revoked',
      );
    }

    // Rotation: thu hồi token cũ trước khi cấp token mới
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

  /** Đăng xuất: thu hồi refresh token hiện tại */
  async logout(refreshToken: string): Promise<{ message: string }> {
    await this.prismaService.refreshToken.updateMany({
      where: { tokenHash: this.hashToken(refreshToken) },
      data: { revoked: true },
    });
    return { message: 'Logged out successfully' };
  }

  async googleLogin(user: {
    email: string;
    name: string;
    googleId: string;
  }): Promise<AuthResult> {
    if (!user) {
      throw new UnauthorizedException('No user from Google');
    }

    // Ưu tiên khớp theo googleId (tài khoản đã từng đăng nhập Google).
    let existingUser = await this.prismaService.user.findFirst({
      where: { googleId: user.googleId },
      include: { role: true },
    });

    if (!existingUser) {
      // Chưa có tài khoản Google -> kiểm tra xem email đã tồn tại (tài khoản local) chưa.
      const userByEmail = await this.prismaService.user.findUnique({
        where: { email: user.email },
        include: { role: true },
      });

      if (userByEmail) {
        // Chỉ auto-link Google vào tài khoản local nếu nó đã được xác thực,
        // tránh việc người khác chiếm tài khoản local chưa verify trùng email.
        if (!userByEmail.isVerified) {
          throw new UnauthorizedException(
            'Email đã được đăng ký nhưng chưa xác thực. Vui lòng xác thực trước khi liên kết Google.',
          );
        }
        existingUser = await this.prismaService.user.update({
          where: { id: userByEmail.id },
          data: { googleId: user.googleId },
          include: { role: true },
        });
      } else {
        const defaultRole = await this.getDefaultRole();
        existingUser = await this.prismaService.user.create({
          data: {
            email: user.email,
            name: user.name,
            googleId: user.googleId,
            isVerified: true,
            role: { connect: { id: defaultRole.id } },
          },
          include: { role: true },
        });
      }
    }

    const tokens = await this.generateTokens(existingUser as UserWithRole);
    return {
      ...tokens,
      user: this.formatUserResponse(existingUser as UserWithRole),
    };
  }

  // re send verification email
  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    // Luôn trả về thông báo chung để không lộ email nào đã đăng ký (account enumeration).
    const genericMessage = {
      message:
        'Nếu email tồn tại và chưa xác thực, mã xác thực mới đã được gửi',
    };

    const user = await this.prismaService.user.findUnique({
      where: { email },
    });
    // Bỏ qua nếu user không tồn tại hoặc đã xác thực -> không tiết lộ trạng thái.
    if (!user || user.isVerified) {
      return genericMessage;
    }

    // Sinh mã mới và LƯU vào DB để verifyEmail đối chiếu được.
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
