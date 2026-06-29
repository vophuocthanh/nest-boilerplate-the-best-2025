import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma, User } from '@prisma/client';

import { paginate } from '@app/src/common/helpers/paginate';
import { USER_SELECT } from '@app/src/configs/const';
import { PaginationParams } from '@app/src/core/model/pagination-params';
import { PaginationResponse } from '@app/src/core/model/pagination-response';
import { PrismaService } from '@app/src/helpers/prisma.service';
import { FileUploadService } from '@app/src/lib/file-upload.service';
import { UpdateUserDto } from '@app/src/modules/user/dto/user.dto';
import { ResponseUtil } from '@app/src/utils/response.util';

@Injectable()
export class UserService {
  private static readonly ALLOWED_SORT_FIELDS = [
    'createAt',
    'updateAt',
    'name',
    'email',
  ] as const;

  constructor(
    private prismaService: PrismaService,
    private fileUploadService: FileUploadService,
  ) {}

  async getAll(pagination: PaginationParams) {
    const { itemsPerPage, skip, search, page, sort, sortBy } = pagination;
    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const sortField =
      typeof sortBy === 'string' &&
      UserService.ALLOWED_SORT_FIELDS.includes(
        sortBy as (typeof UserService.ALLOWED_SORT_FIELDS)[number],
      )
        ? sortBy
        : 'createAt';
    const orderBy: Prisma.UserOrderByWithRelationInput = {
      [sortField]: sort ?? 'desc',
    };

    return paginate(this.prismaService.user, {
      where,
      orderBy,
      select: USER_SELECT,
      page,
      itemsPerPage,
      skip,
    });
  }

  async getDetail(id: string): Promise<Partial<User>> {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateMeUser(data: UpdateUserDto, id: string) {
    // Chỉ cho phép cập nhật các field hồ sơ cá nhân.
    // KHÔNG nhận roleId/isVerified... từ client để tránh leo thang đặc quyền.
    const { name, address, country, phone, date_of_birth } = data;
    const user = await this.prismaService.user.update({
      where: { id },
      data: { name, address, country, phone, date_of_birth },
    });

    return ResponseUtil.success(
      ResponseUtil.formatUserResponse(user),
      'User updated successfully',
    );
  }

  async updateUserRole(
    userId: string,
    roleId: string,
    currentUserId: string,
  ): Promise<PaginationResponse<User>> {
    if (userId === currentUserId) {
      throw new ForbiddenException('You cannot update your own role.');
    }

    const role = await this.prismaService.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new HttpException(
        { message: 'Role not found.' },
        HttpStatus.NOT_FOUND,
      );
    }

    const user = await this.prismaService.user.update({
      where: { id: userId },
      data: { roleId },
    });

    return ResponseUtil.success(
      ResponseUtil.formatUserResponse(user),
      'User role updated successfully',
    );
  }

  async updateAvatarS3(
    userId: string,
    file: Express.Multer.File,
  ): Promise<User> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    const avatarUrl = await this.fileUploadService.uploadImageToS3(
      file,
      'avatars',
    );

    return await this.prismaService.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
    });
  }

  async deleteUser(userId: string, currentUserId: string) {
    const userToDelete = await this.prismaService.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!userToDelete) {
      throw new NotFoundException('User không tồn tại');
    }
    if (userToDelete.role?.name === 'ADMIN') {
      throw new ForbiddenException('Không thể xóa tài khoản có vai trò ADMIN');
    }
    if (userToDelete.id === currentUserId) {
      throw new ForbiddenException('Không thể tự xóa chính mình');
    }
    await this.prismaService.user.delete({
      where: { id: userId },
    });
    return { message: 'Xóa user thành công' };
  }

  async getCountUser(): Promise<{ data: { total: number } }> {
    const totalUsers = await this.prismaService.user.count();
    return { data: { total: totalUsers } };
  }
}
