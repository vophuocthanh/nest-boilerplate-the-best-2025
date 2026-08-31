import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { createHash } from 'crypto';

import { MailService } from '@/integrations/mail/mail.service';
import { UserRepository } from '@/modules/user/user.repository';
import { createMock, expectHttpError } from '@/test/factories';

import { PasswordHasher } from '../password-hasher.service';
import { RefreshTokenRepository } from '../refresh-token.repository';
import { PasswordService } from './password.service';

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

describe('PasswordService', () => {
  let service: PasswordService;
  let userRepository: jest.Mocked<UserRepository>;
  let refreshTokenRepository: jest.Mocked<RefreshTokenRepository>;
  let mail: Record<string, jest.Mock>;
  let passwordHasher: jest.Mocked<PasswordHasher>;

  beforeEach(async () => {
    userRepository = createMock<UserRepository>({
      findByEmail: jest.fn(),
      findByResetTokenHash: jest.fn(),
      findPasswordById: jest.fn(),
      setResetToken: jest.fn(),
      updatePassword: jest.fn(),
      updatePasswordAndClearResetToken: jest.fn(),
    });
    refreshTokenRepository = createMock<RefreshTokenRepository>({
      revokeAllForUser: jest.fn(),
    });
    mail = { sendMail: jest.fn().mockResolvedValue(true) };
    passwordHasher = createMock<PasswordHasher>({
      hash: jest.fn().mockResolvedValue('newhash'),
      compare: jest.fn(),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordService,
        { provide: UserRepository, useValue: userRepository },
        { provide: RefreshTokenRepository, useValue: refreshTokenRepository },
        { provide: MailService, useValue: mail },
        { provide: PasswordHasher, useValue: passwordHasher },
      ],
    }).compile();

    service = module.get(PasswordService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('forgotPassword', () => {
    it('im lặng khi email không tồn tại (chống account enumeration)', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.forgotPassword({ email: 'ghost@b.com' }),
      ).resolves.toBeUndefined();
      expect(mail.sendMail).not.toHaveBeenCalled();
    });

    it('lưu HASH của reset token và gửi token thô qua email', async () => {
      userRepository.findByEmail.mockResolvedValue({
        id: '1',
        email: 'a@b.com',
      } as never);

      await service.forgotPassword({ email: 'a@b.com' });

      const [userId, storedHash] =
        userRepository.setResetToken.mock.calls[0] ?? [];
      const sentToken = mail.sendMail.mock.calls[0][0].context.resetToken;

      expect(userId).toBe('1');
      expect(storedHash).toBe(sha256(sentToken));
      expect(storedHash).not.toBe(sentToken);
    });
  });

  describe('resetPassword', () => {
    it('ném lỗi khi password và confirm không khớp', async () => {
      await expect(
        service.resetPassword('tok', 'NewPass1!', 'Different1!'),
      ).rejects.toThrow(BadRequestException);
    });

    it('ném lỗi khi token không tồn tại hoặc đã hết hạn', async () => {
      userRepository.findByResetTokenHash.mockResolvedValue(null);
      await expectHttpError(
        service.resetPassword('tok', 'NewPass1!', 'NewPass1!'),
        'invalid or has expired',
      );
    });

    it('đặt lại mật khẩu, xoá token và thu hồi mọi refresh token', async () => {
      userRepository.findByResetTokenHash.mockResolvedValue({
        id: '1',
        password: 'oldhash',
        resetTokenExpiresAt: new Date(Date.now() + 100_000),
      } as never);
      passwordHasher.compare.mockResolvedValue(false);

      await service.resetPassword('tok', 'NewPass1!', 'NewPass1!');

      expect(userRepository.findByResetTokenHash).toHaveBeenCalledWith(
        sha256('tok'),
      );
      expect(
        userRepository.updatePasswordAndClearResetToken,
      ).toHaveBeenCalledWith('1', 'newhash');
      expect(refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith('1');
    });
  });

  describe('changePassword', () => {
    it('ném lỗi khi mật khẩu hiện tại sai', async () => {
      userRepository.findPasswordById.mockResolvedValue({
        password: 'oldhash',
      });
      passwordHasher.compare.mockResolvedValue(false);

      await expectHttpError(
        service.changePassword('1', 'wrong', 'NewPass1!', 'NewPass1!'),
        'Current password is incorrect',
      );
    });

    it('từ chối tài khoản Google (không có password)', async () => {
      userRepository.findPasswordById.mockResolvedValue({ password: null });

      await expectHttpError(
        service.changePassword('1', 'x', 'NewPass1!', 'NewPass1!'),
        'Google account',
      );
    });

    it('đổi mật khẩu thành công', async () => {
      userRepository.findPasswordById.mockResolvedValue({
        password: 'oldhash',
      });
      passwordHasher
        .compare!.mockResolvedValueOnce(true) // current password đúng
        .mockResolvedValueOnce(false); // password mới khác password cũ

      await service.changePassword('1', 'Old1!', 'NewPass1!', 'NewPass1!');

      expect(userRepository.updatePassword).toHaveBeenCalledWith(
        '1',
        'newhash',
      );
    });
  });
});
