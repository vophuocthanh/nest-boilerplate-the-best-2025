import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { RoleRepository } from '@/modules/role/role.repository';
import { UserRepository } from '@/modules/user/user.repository';
import { createMock } from '@/test/factories';

import { AuthService } from './auth.service';
import { PasswordHasher } from './password-hasher.service';
import { TokenService } from './services/token.service';

const CREDENTIALS = { email: 'a@b.com', password: 'plain' };

const verifiedUser = (overrides: Record<string, unknown> = {}) => ({
  id: '1',
  name: 'A',
  email: CREDENTIALS.email,
  password: 'hash',
  isVerified: true,
  failedLoginAttempts: 0,
  lockedUntil: null,
  role: { name: 'USER' },
  ...overrides,
});

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<UserRepository>;
  let roleRepository: jest.Mocked<RoleRepository>;
  let tokenService: jest.Mocked<TokenService>;
  let passwordHasher: jest.Mocked<PasswordHasher>;

  beforeEach(async () => {
    userRepository = createMock<UserRepository>({
      findByEmailWithRole: jest.fn(),
      findByGoogleIdWithRole: jest.fn(),
      linkGoogleAccount: jest.fn(),
      createFromGoogle: jest.fn(),
      recordFailedLogin: jest.fn(),
      lockAccount: jest.fn(),
      clearLoginFailures: jest.fn(),
    });
    roleRepository = createMock<RoleRepository>({ findByName: jest.fn() });
    tokenService = createMock<TokenService>({
      generateTokens: jest
        .fn()
        .mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' }),
    });
    passwordHasher = createMock<PasswordHasher>({ compare: jest.fn() });

    const configValues: Record<string, number> = {
      'security.maxFailedLoginAttempts': 3,
      'security.accountLockMinutes': 15,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn((key: string) => configValues[key]) },
        },
        { provide: UserRepository, useValue: userRepository },
        { provide: RoleRepository, useValue: roleRepository },
        { provide: TokenService, useValue: tokenService },
        { provide: PasswordHasher, useValue: passwordHasher },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('login', () => {
    it('ném lỗi chung khi không tìm thấy user', async () => {
      userRepository.findByEmailWithRole.mockResolvedValue(null);
      await expect(service.login(CREDENTIALS)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('ném lỗi chung khi sai mật khẩu và ghi nhận lần đăng nhập sai', async () => {
      userRepository.findByEmailWithRole.mockResolvedValue(
        verifiedUser({ failedLoginAttempts: 1 }) as never,
      );
      passwordHasher.compare.mockResolvedValue(false);

      await expect(service.login(CREDENTIALS)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(userRepository.recordFailedLogin).toHaveBeenCalledWith('1', 2);
      expect(userRepository.lockAccount).not.toHaveBeenCalled();
    });

    it('khoá tài khoản khi vượt ngưỡng đăng nhập sai', async () => {
      userRepository.findByEmailWithRole.mockResolvedValue(
        verifiedUser({ failedLoginAttempts: 2 }) as never,
      );
      passwordHasher.compare.mockResolvedValue(false);

      await expect(service.login(CREDENTIALS)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(userRepository.lockAccount).toHaveBeenCalledWith(
        '1',
        expect.any(Date),
      );
      expect(userRepository.recordFailedLogin).not.toHaveBeenCalled();
    });

    it('từ chối khi tài khoản đang bị khoá, kể cả mật khẩu đúng', async () => {
      userRepository.findByEmailWithRole.mockResolvedValue(
        verifiedUser({ lockedUntil: new Date(Date.now() + 60_000) }) as never,
      );
      passwordHasher.compare.mockResolvedValue(true);

      await expect(service.login(CREDENTIALS)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(passwordHasher.compare).not.toHaveBeenCalled();
    });

    it('ném lỗi khi account chưa verify', async () => {
      userRepository.findByEmailWithRole.mockResolvedValue(
        verifiedUser({ isVerified: false }) as never,
      );
      passwordHasher.compare.mockResolvedValue(true);

      await expect(service.login(CREDENTIALS)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('ném 403 khi user chưa được gán role', async () => {
      userRepository.findByEmailWithRole.mockResolvedValue(
        verifiedUser({ role: null }) as never,
      );
      passwordHasher.compare.mockResolvedValue(true);

      await expect(service.login(CREDENTIALS)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('trả token + user an toàn khi đăng nhập thành công', async () => {
      userRepository.findByEmailWithRole.mockResolvedValue(
        verifiedUser({ failedLoginAttempts: 2 }) as never,
      );
      passwordHasher.compare.mockResolvedValue(true);

      const result = await service.login(CREDENTIALS);

      expect(result).toEqual({
        accessToken: 'at',
        refreshToken: 'rt',
        user: { id: '1', name: 'A', email: CREDENTIALS.email, role: 'USER' },
      });
      // Bộ đếm đăng nhập sai được reset sau khi đăng nhập thành công.
      expect(userRepository.clearLoginFailures).toHaveBeenCalledWith('1');
    });

    it('không trả bất kỳ field nhạy cảm nào trong `user`', async () => {
      userRepository.findByEmailWithRole.mockResolvedValue(
        verifiedUser({ resetToken: 'secret', googleId: 'g-1' }) as never,
      );
      passwordHasher.compare.mockResolvedValue(true);

      const { user } = await service.login(CREDENTIALS);

      expect(Object.keys(user).sort()).toEqual(['email', 'id', 'name', 'role']);
    });
  });

  describe('googleLogin', () => {
    const profile = { email: 'a@b.com', name: 'A', googleId: 'g-1' };

    it('dùng lại tài khoản đã liên kết googleId', async () => {
      userRepository.findByGoogleIdWithRole.mockResolvedValue(
        verifiedUser() as never,
      );

      const result = await service.googleLogin(profile);

      expect(result.user.id).toBe('1');
      expect(userRepository.createFromGoogle).not.toHaveBeenCalled();
    });

    it('từ chối liên kết Google vào tài khoản local CHƯA verify', async () => {
      userRepository.findByGoogleIdWithRole.mockResolvedValue(null);
      userRepository.findByEmailWithRole.mockResolvedValue(
        verifiedUser({ isVerified: false }) as never,
      );

      await expect(service.googleLogin(profile)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(userRepository.linkGoogleAccount).not.toHaveBeenCalled();
    });

    it('liên kết Google vào tài khoản local đã verify', async () => {
      userRepository.findByGoogleIdWithRole.mockResolvedValue(null);
      userRepository.findByEmailWithRole.mockResolvedValue(
        verifiedUser() as never,
      );
      userRepository.linkGoogleAccount.mockResolvedValue(
        verifiedUser({ googleId: 'g-1' }) as never,
      );

      await service.googleLogin(profile);

      expect(userRepository.linkGoogleAccount).toHaveBeenCalledWith('1', 'g-1');
    });

    it('tạo user mới với role mặc định khi chưa tồn tại', async () => {
      userRepository.findByGoogleIdWithRole.mockResolvedValue(null);
      userRepository.findByEmailWithRole.mockResolvedValue(null);
      roleRepository.findByName.mockResolvedValue({
        id: 'role-1',
        name: 'USER',
      });
      userRepository.createFromGoogle.mockResolvedValue(
        verifiedUser() as never,
      );

      await service.googleLogin(profile);

      expect(userRepository.createFromGoogle).toHaveBeenCalledWith({
        email: profile.email,
        name: profile.name,
        googleId: profile.googleId,
        roleId: 'role-1',
      });
    });
  });
});
