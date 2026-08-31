import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { createHash } from 'crypto';

import { UserRepository } from '@/modules/user/user.repository';
import { createMock } from '@/test/factories';

import { RefreshTokenRepository } from '../refresh-token.repository';
import { TokenService } from './token.service';

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

const DTO = { refreshToken: 'raw-refresh' };

describe('TokenService', () => {
  let service: TokenService;
  let jwt: Record<string, jest.Mock>;
  let userRepository: jest.Mocked<UserRepository>;
  let refreshTokenRepository: jest.Mocked<RefreshTokenRepository>;

  beforeEach(async () => {
    jwt = {
      signAsync: jest.fn().mockResolvedValue('signed.jwt.token'),
      verify: jest.fn(),
    };
    userRepository = createMock<UserRepository>({
      findByIdWithRole: jest.fn(),
    });
    refreshTokenRepository = createMock<RefreshTokenRepository>({
      create: jest.fn(),
      findByHash: jest.fn(),
      revokeById: jest.fn(),
      revokeByHash: jest.fn(),
      revokeAllForUser: jest.fn(),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: { get: jest.fn(() => 'secret') } },
        { provide: UserRepository, useValue: userRepository },
        {
          provide: RefreshTokenRepository,
          useValue: refreshTokenRepository,
        },
      ],
    }).compile();

    service = module.get(TokenService);
  });

  afterEach(() => jest.clearAllMocks());

  it('ném lỗi khi chữ ký refresh token sai', async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('invalid');
    });
    await expect(service.refreshToken(DTO)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('ném lỗi khi token không tồn tại hoặc đã hết hạn', async () => {
    jwt.verify.mockReturnValue({ id: '1' });
    refreshTokenRepository.findByHash.mockResolvedValue(null);
    await expect(service.refreshToken(DTO)).rejects.toThrow(
      'invalid or has been revoked',
    );
  });

  it('phát hiện reuse: token đã thu hồi bị dùng lại -> thu hồi toàn bộ phiên', async () => {
    jwt.verify.mockReturnValue({ id: '1' });
    refreshTokenRepository.findByHash.mockResolvedValue({
      id: 'rt1',
      userId: '1',
      revoked: true,
      expiresAt: new Date(Date.now() + 100_000),
    } as never);

    await expect(service.refreshToken(DTO)).rejects.toThrow('reuse detected');
    expect(refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith('1');
  });

  it('thu hồi token cũ, cấp cặp mới và lưu hash của refresh token', async () => {
    jwt.verify.mockReturnValue({ id: '1' });
    refreshTokenRepository.findByHash.mockResolvedValue({
      id: 'rt1',
      userId: '1',
      revoked: false,
      expiresAt: new Date(Date.now() + 100_000),
    } as never);
    userRepository.findByIdWithRole.mockResolvedValue({
      id: '1',
      name: 'A',
      email: 'a@b.com',
      role: { name: 'USER' },
    } as never);

    const result = await service.refreshToken(DTO);

    expect(refreshTokenRepository.revokeById).toHaveBeenCalledWith('rt1');
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    // Lưu HASH, không lưu token thô.
    expect(refreshTokenRepository.create).toHaveBeenCalledWith(
      '1',
      sha256('signed.jwt.token'),
      expect.any(Date),
    );
  });

  it('logout thu hồi refresh token theo hash', async () => {
    await service.logout('raw-refresh');
    expect(refreshTokenRepository.revokeByHash).toHaveBeenCalledWith(
      sha256('raw-refresh'),
    );
  });
});
