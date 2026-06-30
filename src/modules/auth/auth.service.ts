import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { User } from '@prisma/client';

import { compare } from 'bcrypt';

import { PrismaService } from '@app/src/prisma/prisma.service';

import { formatUserResponse, getDefaultRole } from './auth.helpers';
import { ForgotPasswordDto } from './dto/auth.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { PasswordService } from './services/password.service';
import { RegistrationService } from './services/registration.service';
import { TokenService } from './services/token.service';
import { AuthResult, AuthTokens, UserWithRole } from './types/auth.types';

/**
 * Authentication facade.
 *
 * - Handled here directly: login + brute-force protection (lockout) and Google login.
 * - Delegated to dedicated services:
 *   - {@link RegistrationService}: registration, email verification
 *   - {@link PasswordService}: forgot/reset/change password
 *   - {@link TokenService}: refresh token rotation, logout
 *
 * Controllers only need to inject AuthService; the internals are split by concern.
 */
@Injectable()
export class AuthService {
  private readonly maxFailedAttempts: number;
  private readonly lockMinutes: number;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
    private readonly registrationService: RegistrationService,
    private readonly passwordService: PasswordService,
  ) {
    this.maxFailedAttempts =
      this.configService.get<number>('security.maxFailedLoginAttempts') ?? 5;
    this.lockMinutes =
      this.configService.get<number>('security.accountLockMinutes') ?? 15;
  }

  // ---------------------------------------------------------------------------
  // Login + brute-force protection
  // ---------------------------------------------------------------------------

  async login(credentials: {
    email: string;
    password: string;
  }): Promise<AuthResult> {
    const user = await this.findAndValidateUser(credentials);
    const tokens = await this.tokenService.generateTokens(user);
    return { ...tokens, user: formatUserResponse(user) };
  }

  private async findAndValidateUser(credentials: {
    email: string;
    password: string;
  }): Promise<UserWithRole> {
    // Use a single generic message for both "email not found" and "wrong password"
    // -> avoid leaking which emails are registered (account enumeration).
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

    // Account is temporarily locked due to too many failed login attempts.
    // Still return the generic error so we don't reveal whether the account exists.
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw invalidCredentials;
    }

    const isPasswordValid = await compare(credentials.password, user.password);
    if (!isPasswordValid) {
      await this.registerFailedLogin(user.id, user.failedLoginAttempts);
      throw invalidCredentials;
    }

    // Successful login -> reset the counter if there were prior failures.
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prismaService.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
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
    // role is guaranteed non-null by the check above
    return user as UserWithRole;
  }

  /**
   * Record a failed login attempt. Once it exceeds maxFailedAttempts,
   * lock the account for lockMinutes minutes and reset the counter.
   */
  private async registerFailedLogin(
    userId: string,
    currentAttempts: number,
  ): Promise<void> {
    const attempts = currentAttempts + 1;
    if (attempts >= this.maxFailedAttempts) {
      const lockedUntil = new Date();
      lockedUntil.setMinutes(lockedUntil.getMinutes() + this.lockMinutes);
      await this.prismaService.user.update({
        where: { id: userId },
        data: { failedLoginAttempts: 0, lockedUntil },
      });
      return;
    }
    await this.prismaService.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: attempts },
    });
  }

  // ---------------------------------------------------------------------------
  // Google login
  // ---------------------------------------------------------------------------

  async googleLogin(user: {
    email: string;
    name: string;
    googleId: string;
  }): Promise<AuthResult> {
    if (!user) {
      throw new UnauthorizedException('No user from Google');
    }

    // Prefer matching by googleId (an account that has logged in with Google before).
    let existingUser = await this.prismaService.user.findFirst({
      where: { googleId: user.googleId },
      include: { role: true },
    });

    if (!existingUser) {
      // No Google account yet -> check whether the email already exists (a local account).
      const userByEmail = await this.prismaService.user.findUnique({
        where: { email: user.email },
        include: { role: true },
      });

      if (userByEmail) {
        // Only auto-link Google to a local account if it is already verified,
        // to prevent someone from hijacking an unverified local account with the same email.
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
        const defaultRole = await getDefaultRole(this.prismaService);
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

    const tokens = await this.tokenService.generateTokens(
      existingUser as UserWithRole,
    );
    return {
      ...tokens,
      user: formatUserResponse(existingUser as UserWithRole),
    };
  }

  // ---------------------------------------------------------------------------
  // Facade — delegate to the dedicated services
  // ---------------------------------------------------------------------------

  register(userData: RegisterDto): Promise<{ message: string }> {
    return this.registrationService.register(userData);
  }

  verifyEmail(email: string, code: string): Promise<{ message: string }> {
    return this.registrationService.verifyEmail(email, code);
  }

  resendVerificationEmail(email: string): Promise<{ message: string }> {
    return this.registrationService.resendVerificationEmail(email);
  }

  forgotPassword(data: ForgotPasswordDto): Promise<{ message: string }> {
    return this.passwordService.forgotPassword(data);
  }

  resetPassword(
    token: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<{ message: string }> {
    return this.passwordService.resetPassword(
      token,
      newPassword,
      confirmPassword,
    );
  }

  changePassword(
    user: User,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<{ message: string }> {
    return this.passwordService.changePassword(
      user,
      currentPassword,
      newPassword,
      confirmPassword,
    );
  }

  refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthTokens> {
    return this.tokenService.refreshToken(refreshTokenDto);
  }

  logout(refreshToken: string): Promise<{ message: string }> {
    return this.tokenService.logout(refreshToken);
  }
}
