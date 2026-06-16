import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '@app/src/helpers/prisma.service';
import { FileUploadService } from '@app/src/lib/file-upload.service';

import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let prisma: { user: Record<string, jest.Mock> };
  let fileUpload: Record<string, jest.Mock>;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
      },
    };
    fileUpload = { uploadImageToS3: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: prisma },
        { provide: FileUploadService, useValue: fileUpload },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getDetail', () => {
    it('ném NotFoundException khi user không tồn tại', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getDetail('x')).rejects.toThrow(NotFoundException);
    });

    it('trả user khi tồn tại', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1', email: 'a@b.com' });
      const user = await service.getDetail('1');
      expect(user).toEqual({ id: '1', email: 'a@b.com' });
    });
  });

  describe('getAll', () => {
    it('trả về dữ liệu phân trang', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: '1' }, { id: '2' }]);
      prisma.user.count.mockResolvedValue(2);

      const result = await service.getAll({
        itemsPerPage: 10,
        page: 1,
        skip: 0,
        search: '',
      });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.currentPage).toBe(1);
    });
  });

  describe('deleteUser', () => {
    it('ném NotFoundException khi user cần xoá không tồn tại', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.deleteUser('target', 'current')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('không cho xoá tài khoản ADMIN', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'target',
        role: { name: 'ADMIN' },
      });
      await expect(service.deleteUser('target', 'current')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('không cho tự xoá chính mình', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'same',
        role: { name: 'USER' },
      });
      await expect(service.deleteUser('same', 'same')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('xoá thành công user thường', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'target',
        role: { name: 'USER' },
      });
      prisma.user.delete.mockResolvedValue({});

      const result = await service.deleteUser('target', 'current');

      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'target' },
      });
      expect(result.message).toBeDefined();
    });
  });

  describe('getCountUser', () => {
    it('trả về tổng số user', async () => {
      prisma.user.count.mockResolvedValue(42);
      const result = await service.getCountUser();
      expect(result).toEqual({ data: { total: 42 } });
    });
  });
});
