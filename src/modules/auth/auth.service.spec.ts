import { HttpException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';

import { MailService } from '@app/src/modules/mail/mail.service';
import { PrismaService } from '@app/src/prisma/prisma.service';

import { AuthService } from './auth.service';
import { PasswordService } from './services/password.service';
import { RegistrationService } from './services/registration.service';
import { TokenService } from './services/token.service';

jest.mock('bcrypt');

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

/** Kiểm tra promise reject với HttpException có payload chứa chuỗi mong đợi */
const expectHttpError = async (promise: Promise<unknown>, substr: string) => {
  await expect(promise).rejects.toThrow(HttpException);
  await promise.catch((e: HttpException) => {
    expect(JSON.stringify(e.getResponse())).toContain(substr);
  });
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: Record<string, jest.Mock>;
    role: Record<string, jest.Mock>;
    refreshToken: Record<string, jest.Mock>;
  };
  let jwt: Record<string, jest.Mock>;
  let mail: Record<string, jest.Mock>;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      role: { findUnique: jest.fn() },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    jwt = {
      signAsync: jest.fn().mockResolvedValue('signed.jwt.token'),
      sign: jest.fn().mockReturnValue('signed.jwt.token'),
      verify: jest.fn(),
    };
    mail = { sendMail: jest.fn().mockResolvedValue(undefined) };

    const configValues: Record<string, string> = {
      'jwt.accessSecret': 'access-secret',
      'jwt.refreshSecret': 'refresh-secret',
      'jwt.accessExpiresIn': '1d',
      'jwt.refreshExpiresIn': '7d',
    };
    const config = { get: jest.fn((key: string) => configValues[key]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        // Các service con dùng chung mock Prisma/Jwt/Mail/Config
        TokenService,
        RegistrationService,
        PasswordService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: MailService, useValue: mail },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('login', () => {
    const credentials = { email: 'a@b.com', password: 'plain' };

    it('ném lỗi khi không tìm thấy user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login(credentials)).rejects.toThrow(HttpException);
    });

    it('ném lỗi khi account chưa verify', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        isVerified: false,
        role: { name: 'USER' },
        password: 'hash',
      });
      // Mật khẩu đúng -> mới tới được bước kiểm tra verify
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      await expectHttpError(
        service.login(credentials),
        'Account is not verified',
      );
    });

    it('ném lỗi khi sai mật khẩu', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        isVerified: true,
        role: { name: 'USER' },
        password: 'hash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expectHttpError(
        service.login(credentials),
        'Email hoặc mật khẩu không đúng',
      );
    });

    it('trả token + user khi đăng nhập thành công, đồng thời lưu refresh token', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        name: 'A',
        email: 'a@b.com',
        isVerified: true,
        role: { name: 'USER' },
        password: 'hash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(credentials);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toEqual({
        id: '1',
        name: 'A',
        email: 'a@b.com',
        role: 'USER',
      });
      // Refresh token được persist (rotation/revoke)
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('refreshToken (rotation)', () => {
    const dto = { refreshToken: 'raw-refresh' };

    it('ném lỗi khi chữ ký token sai', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('invalid');
      });
      await expect(service.refreshToken(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('phát hiện reuse: token đã thu hồi nhưng bị dùng lại -> thu hồi toàn bộ session', async () => {
      jwt.verify.mockReturnValue({ id: '1' });
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        userId: '1',
        revoked: true,
        expiresAt: new Date(Date.now() + 100000),
      });
      await expect(service.refreshToken(dto)).rejects.toThrow('reuse detected');
      // Toàn bộ refresh token của user bị thu hồi
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: '1' },
        data: { revoked: true },
      });
    });

    it('ném lỗi khi token không tồn tại hoặc đã hết hạn', async () => {
      jwt.verify.mockReturnValue({ id: '1' });
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refreshToken(dto)).rejects.toThrow(
        'invalid or has been revoked',
      );
    });

    it('thu hồi token cũ và cấp cặp token mới', async () => {
      jwt.verify.mockReturnValue({ id: '1' });
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        revoked: false,
        expiresAt: new Date(Date.now() + 100000),
      });
      prisma.user.findUnique.mockResolvedValue({
        id: '1',
        name: 'A',
        email: 'a@b.com',
        role: { name: 'USER' },
      });

      const result = await service.refreshToken(dto);

      // Token cũ bị revoke
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt1' },
        data: { revoked: true },
      });
      // Cấp token mới + persist
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetPassword', () => {
    it('ném lỗi khi password và confirm không khớp', async () => {
      await expectHttpError(
        service.resetPassword('tok', 'NewPass1', 'Different1'),
        'do not match',
      );
    });

    it('ném lỗi khi token không tồn tại/hết hạn', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expectHttpError(
        service.resetPassword('tok', 'NewPass1', 'NewPass1'),
        'invalid or has expired',
      );
    });

    it('đặt lại mật khẩu, xoá token và thu hồi refresh token', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: '1',
        password: 'oldhash',
        resetToken: sha256('tok'),
        resetTokenExpiresAt: new Date(Date.now() + 100000),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false); // khác mật khẩu cũ
      (bcrypt.hash as jest.Mock).mockResolvedValue('newhash');

      const result = await service.resetPassword('tok', 'NewPass1', 'NewPass1');

      expect(result.message).toContain('successfully');
      // Token reset bị xoá sau khi dùng
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resetToken: null,
            resetTokenExpiresAt: null,
          }),
        }),
      );
      // Thu hồi mọi refresh token
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: '1' },
        data: { revoked: true },
      });
    });
  });

  describe('logout', () => {
    it('thu hồi refresh token theo hash', async () => {
      await service.logout('raw-refresh');
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: sha256('raw-refresh') },
        data: { revoked: true },
      });
    });
  });

  describe('forgotPassword', () => {
    it('tạo reset token, lưu hash + gửi mail', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1', email: 'a@b.com' });

      const result = await service.forgotPassword({ email: 'a@b.com' });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1' },
          data: expect.objectContaining({
            resetToken: expect.any(String),
            resetTokenExpiresAt: expect.any(Date),
          }),
        }),
      );
      expect(mail.sendMail).toHaveBeenCalledTimes(1);
      expect(result.message).toContain('email');
    });
  });
});
