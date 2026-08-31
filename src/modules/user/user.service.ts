import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AVATAR_FOLDER } from '@/integrations/storage/storage.constants';
import { StorageService } from '@/integrations/storage/storage.service';
import { ADMIN_ROLE_NAME } from '@/modules/role/role.constants';
import { RoleRepository } from '@/modules/role/role.repository';
import { Paginated } from '@/shared/pagination/paginated';
import { PaginationParams } from '@/shared/pagination/pagination-params';

import { UpdateUserDto } from './dto/update-user.dto';
import { UserCountDto, UserDto } from './dto/user-response.dto';
import { toUserDto } from './user.mapper';
import { SafeUserRow, UserRepository } from './user.repository';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly storageService: StorageService,
  ) {}

  getAll(pagination: PaginationParams): Promise<Paginated<SafeUserRow>> {
    return this.userRepository.paginate(pagination);
  }

  async getDetail(id: string): Promise<UserDto> {
    const user = await this.userRepository.findByIdWithRole(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return toUserDto(user);
  }

  async updateMe(id: string, data: UpdateUserDto): Promise<UserDto> {
    // Chỉ nhận các field hồ sơ cá nhân. KHÔNG nhận roleId/isVerified... từ client
    // để tránh leo thang đặc quyền.
    const { name, address, country, phone, date_of_birth } = data;
    const user = await this.userRepository.updateProfile(id, {
      name,
      address,
      country,
      phone,
      date_of_birth,
    });
    return toUserDto(user);
  }

  async updateUserRole(
    userId: string,
    roleId: string,
    currentUserId: string,
  ): Promise<UserDto> {
    if (userId === currentUserId) {
      throw new ForbiddenException('You cannot update your own role.');
    }
    if (!(await this.roleRepository.findById(roleId))) {
      throw new NotFoundException('Role not found.');
    }

    const user = await this.userRepository.updateRole(userId, roleId);
    return toUserDto(user);
  }

  async updateAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<UserDto> {
    // Không cần findUnique trước: nếu user không tồn tại, update sẽ ném P2025
    // và được AllExceptionsFilter chuẩn hoá thành 404.
    const avatarUrl = await this.storageService.upload(file, AVATAR_FOLDER);
    const user = await this.userRepository.updateAvatar(userId, avatarUrl);
    return toUserDto(user);
  }

  async deleteUser(userId: string, currentUserId: string): Promise<void> {
    if (userId === currentUserId) {
      throw new ForbiddenException('Không thể tự xóa chính mình');
    }

    const user = await this.userRepository.findByIdWithRole(userId);
    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }
    if (user.role?.name === ADMIN_ROLE_NAME) {
      throw new ForbiddenException('Không thể xóa tài khoản có vai trò ADMIN');
    }

    await this.userRepository.delete(userId);
  }

  async getCountUser(): Promise<UserCountDto> {
    return { total: await this.userRepository.count() };
  }
}
