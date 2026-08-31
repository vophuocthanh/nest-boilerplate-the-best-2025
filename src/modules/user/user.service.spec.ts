import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { StorageService } from '@/integrations/storage/storage.service';
import { RoleRepository } from '@/modules/role/role.repository';
import { createMock, paginationParams } from '@/test/factories';

import { UserRepository } from './user.repository';
import { UserService } from './user.service';

/** Bản ghi user đầy đủ như Prisma trả về — CÓ cả field nhạy cảm. */
const fullUserRow = (overrides: Record<string, unknown> = {}) => ({
  id: '1',
  email: 'a@b.com',
  name: 'A',
  phone: null,
  address: null,
  avatar: null,
  date_of_birth: null,
  country: null,
  isVerified: true,
  createAt: new Date(),
  updateAt: null,
  role: { name: 'USER' },
  // Những field KHÔNG được phép lọt ra client:
  password: '$2b$12$hash',
  googleId: 'g-1',
  resetToken: 'reset-hash',
  resetTokenExpiresAt: new Date(),
  verificationCode: 'code-hash',
  verificationCodeExpiresAt: new Date(),
  failedLoginAttempts: 3,
  lockedUntil: new Date(),
  roleId: 'role-1',
  ...overrides,
});

const SENSITIVE_FIELDS = [
  'password',
  'googleId',
  'resetToken',
  'resetTokenExpiresAt',
  'verificationCode',
  'verificationCodeExpiresAt',
  'failedLoginAttempts',
  'lockedUntil',
  'roleId',
];

describe('UserService', () => {
  let service: UserService;
  let userRepository: jest.Mocked<UserRepository>;
  let roleRepository: jest.Mocked<RoleRepository>;
  let storage: jest.Mocked<StorageService>;

  beforeEach(async () => {
    userRepository = createMock<UserRepository>({
      findByIdWithRole: jest.fn(),
      paginate: jest.fn(),
      updateProfile: jest.fn(),
      updateRole: jest.fn(),
      updateAvatar: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    });
    roleRepository = createMock<RoleRepository>({ findById: jest.fn() });
    storage = createMock<StorageService>({ upload: jest.fn() });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: UserRepository, useValue: userRepository },
        { provide: RoleRepository, useValue: roleRepository },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();

    service = module.get(UserService);
  });

  afterEach(() => jest.clearAllMocks());

  // Bài test quan trọng nhất của module: mapper là whitelist, nên mọi field
  // nhạy cảm phải biến mất kể cả khi repository trả về bản ghi đầy đủ.
  describe('không rò rỉ field nhạy cảm', () => {
    it.each([
      [
        'getDetail',
        () => {
          userRepository.findByIdWithRole.mockResolvedValue(
            fullUserRow() as never,
          );
          return service.getDetail('1');
        },
      ],
      [
        'updateMe',
        () => {
          userRepository.updateProfile.mockResolvedValue(
            fullUserRow() as never,
          );
          return service.updateMe('1', { name: 'B' });
        },
      ],
      [
        'updateAvatar',
        () => {
          storage.upload.mockResolvedValue('https://cdn/avatar.png');
          userRepository.updateAvatar.mockResolvedValue(fullUserRow() as never);
          return service.updateAvatar('1', {} as Express.Multer.File);
        },
      ],
    ])('%s trả về DTO đã lọc', async (_name, run) => {
      const dto = await run();
      for (const field of SENSITIVE_FIELDS) {
        expect(dto).not.toHaveProperty(field);
      }
      expect(dto.role).toBe('USER');
    });
  });

  describe('getDetail', () => {
    it('ném NotFoundException khi user không tồn tại', async () => {
      userRepository.findByIdWithRole.mockResolvedValue(null);
      await expect(service.getDetail('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAll', () => {
    it('uỷ quyền cho repository và trả nguyên `{ items, meta }`', async () => {
      const page = {
        items: [{ id: '1' }, { id: '2' }],
        meta: { total: 2, page: 1, pageSize: 10, totalPages: 1 },
      };
      userRepository.paginate.mockResolvedValue(page as never);

      const params = paginationParams();
      await expect(service.getAll(params)).resolves.toBe(page);
      expect(userRepository.paginate).toHaveBeenCalledWith(params);
    });
  });

  describe('updateUserRole', () => {
    it('không cho tự đổi role của chính mình', async () => {
      await expect(service.updateUserRole('1', 'r', '1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('ném NotFoundException khi role không tồn tại', async () => {
      roleRepository.findById.mockResolvedValue(null);
      await expect(
        service.updateUserRole('target', 'ghost-role', 'current'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteUser', () => {
    it('không cho tự xoá chính mình', async () => {
      await expect(service.deleteUser('same', 'same')).rejects.toThrow(
        ForbiddenException,
      );
      expect(userRepository.findByIdWithRole).not.toHaveBeenCalled();
    });

    it('ném NotFoundException khi user cần xoá không tồn tại', async () => {
      userRepository.findByIdWithRole.mockResolvedValue(null);
      await expect(service.deleteUser('target', 'current')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('không cho xoá tài khoản ADMIN', async () => {
      userRepository.findByIdWithRole.mockResolvedValue(
        fullUserRow({ id: 'target', role: { name: 'ADMIN' } }) as never,
      );
      await expect(service.deleteUser('target', 'current')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('xoá thành công user thường', async () => {
      userRepository.findByIdWithRole.mockResolvedValue(
        fullUserRow({ id: 'target' }) as never,
      );

      await expect(
        service.deleteUser('target', 'current'),
      ).resolves.toBeUndefined();
      expect(userRepository.delete).toHaveBeenCalledWith('target');
    });
  });

  describe('getCountUser', () => {
    it('trả về tổng số user', async () => {
      userRepository.count.mockResolvedValue(42);
      await expect(service.getCountUser()).resolves.toEqual({ total: 42 });
    });
  });
});
