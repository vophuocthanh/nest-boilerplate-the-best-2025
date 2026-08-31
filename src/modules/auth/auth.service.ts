import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DEFAULT_ROLE_NAME } from '@/modules/role/role.constants';
import { RoleRepository } from '@/modules/role/role.repository';
import { UserRepository, UserWithRole } from '@/modules/user/user.repository';

import { toSafeUser } from './auth.mapper';
import { LoginDto } from './dto/login.dto';
import { PasswordHasher } from './password-hasher.service';
import { TokenService } from './services/token.service';
import { AuthResult, GoogleProfile } from './types/auth.types';

const DEFAULT_MAX_FAILED_ATTEMPTS = 5;
const DEFAULT_LOCK_MINUTES = 15;

/**
 * Xác thực người dùng: đăng nhập bằng mật khẩu (kèm chống brute-force) và đăng
 * nhập bằng Google.
 *
 * Trước đây class này còn là facade chuyển tiếp 8 method sang
 * Token/Registration/PasswordService mà không thêm logic nào — controller giờ
 * inject thẳng các service đó, nên bỏ được một lớp phải sửa mỗi lần đổi chữ ký.
 */
@Injectable()
export class AuthService {
  private readonly maxFailedAttempts: number;
  private readonly lockMinutes: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly tokenService: TokenService,
    private readonly passwordHasher: PasswordHasher,
  ) {
    this.maxFailedAttempts =
      this.configService.get<number>('security.maxFailedLoginAttempts') ??
      DEFAULT_MAX_FAILED_ATTEMPTS;
    this.lockMinutes =
      this.configService.get<number>('security.accountLockMinutes') ??
      DEFAULT_LOCK_MINUTES;
  }

  async login(credentials: LoginDto): Promise<AuthResult> {
    const user = await this.authenticate(credentials);
    const tokens = await this.tokenService.generateTokens(user);
    return { ...tokens, user: toSafeUser(user) };
  }

  async googleLogin(profile: GoogleProfile): Promise<AuthResult> {
    const user = await this.findOrCreateGoogleUser(profile);
    const tokens = await this.tokenService.generateTokens(user);
    return { ...tokens, user: toSafeUser(user) };
  }

  // --- Đăng nhập bằng mật khẩu ----------------------------------------------

  private async authenticate({
    email,
    password,
  }: LoginDto): Promise<UserWithRole> {
    // Dùng CHUNG một message cho "email không tồn tại" và "sai mật khẩu"
    // -> không tiết lộ email nào đã đăng ký (account enumeration).
    const invalidCredentials = new UnauthorizedException({
      message: { credentials: 'Email hoặc mật khẩu không đúng' },
    });

    const user = await this.userRepository.findByEmailWithRole(email);
    if (!user?.password) {
      throw invalidCredentials;
    }

    // Tài khoản đang bị khoá tạm thời vì đăng nhập sai quá nhiều lần.
    // Vẫn trả message chung để không lộ việc tài khoản có tồn tại.
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw invalidCredentials;
    }

    if (!(await this.passwordHasher.compare(password, user.password))) {
      await this.recordFailedLogin(user.id, user.failedLoginAttempts);
      throw invalidCredentials;
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.userRepository.clearLoginFailures(user.id);
    }

    if (!user.isVerified) {
      throw new UnauthorizedException({
        message: { account: 'Account is not verified' },
      });
    }
    if (!user.role) {
      throw new ForbiddenException({
        message: { role: 'User role not assigned' },
      });
    }

    return user;
  }

  /**
   * Ghi nhận một lần đăng nhập sai. Vượt ngưỡng thì khoá tài khoản trong
   * `lockMinutes` phút và reset bộ đếm.
   */
  private async recordFailedLogin(
    userId: string,
    currentAttempts: number,
  ): Promise<void> {
    const attempts = currentAttempts + 1;
    if (attempts < this.maxFailedAttempts) {
      await this.userRepository.recordFailedLogin(userId, attempts);
      return;
    }

    const lockedUntil = new Date();
    lockedUntil.setMinutes(lockedUntil.getMinutes() + this.lockMinutes);
    await this.userRepository.lockAccount(userId, lockedUntil);
  }

  // --- Đăng nhập bằng Google ------------------------------------------------

  private async findOrCreateGoogleUser(
    profile: GoogleProfile,
  ): Promise<UserWithRole> {
    // Ưu tiên khớp theo googleId (tài khoản đã từng đăng nhập bằng Google).
    const byGoogleId = await this.userRepository.findByGoogleIdWithRole(
      profile.googleId,
    );
    if (byGoogleId) {
      return byGoogleId;
    }

    const byEmail = await this.userRepository.findByEmailWithRole(
      profile.email,
    );
    if (byEmail) {
      // Chỉ tự động liên kết Google vào tài khoản local ĐÃ verify, tránh việc
      // chiếm tài khoản chưa verify trùng email.
      if (!byEmail.isVerified) {
        throw new UnauthorizedException(
          'Email đã được đăng ký nhưng chưa xác thực. Vui lòng xác thực trước khi liên kết Google.',
        );
      }
      return this.userRepository.linkGoogleAccount(
        byEmail.id,
        profile.googleId,
      );
    }

    const role = await this.roleRepository.findByName(DEFAULT_ROLE_NAME);
    if (!role) {
      throw new Error(
        `Default role "${DEFAULT_ROLE_NAME}" is missing. Run "pnpm seed".`,
      );
    }

    return this.userRepository.createFromGoogle({
      email: profile.email,
      name: profile.name,
      googleId: profile.googleId,
      roleId: role.id,
    });
  }
}
