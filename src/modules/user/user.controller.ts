import {
  BadRequestException,
  Body,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';

import { imageUploadOptions } from '@/config/multer.config';
import { ADMIN_ROLE_NAME } from '@/modules/role/role.constants';
import { ApiCommonResponses } from '@/shared/decorators/api-common-responses.decorator';
import { AuthenticatedController } from '@/shared/decorators/authenticated-controller.decorator';
import { CommonPagination } from '@/shared/decorators/common-pagination.decorator';
import { CurrentUserId } from '@/shared/decorators/current-user.decorator';
import { Pagination } from '@/shared/decorators/pagination.decorator';
import { ResponseMessage } from '@/shared/decorators/response-message.decorator';
import { Roles } from '@/shared/decorators/roles.decorator';
import { Paginated } from '@/shared/pagination/paginated';
import { PaginationParams } from '@/shared/pagination/pagination-params';

import { UpdateUserDto, UpdateUserRoleDto } from './dto/update-user.dto';
import { UserCountDto, UserDto } from './dto/user-response.dto';
import { USER_SORT_FIELDS } from './user.constants';
import { SafeUserRow } from './user.repository';
import { UserService } from './user.service';

/** Schema Swagger cho form upload một file ảnh. */
const SINGLE_FILE_SCHEMA = {
  type: 'object',
  properties: { file: { type: 'string', format: 'binary' } },
};

@ApiTags('User')
@AuthenticatedController('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiCommonResponses('Lấy ra thông tin user đang đăng nhập')
  getCurrentUser(@CurrentUserId() userId: string): Promise<UserDto> {
    return this.userService.getDetail(userId);
  }

  @Put('me')
  @ApiCommonResponses('Cập nhật thông tin user đang đăng nhập')
  @ResponseMessage('User updated successfully')
  updateMe(
    @CurrentUserId() userId: string,
    @Body() data: UpdateUserDto,
  ): Promise<UserDto> {
    return this.userService.updateMe(userId, data);
  }

  @Post('upload-avatar')
  @ApiCommonResponses('Upload user avatar')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: SINGLE_FILE_SCHEMA })
  @ResponseMessage('Avatar updated successfully')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  uploadAvatar(
    @CurrentUserId() userId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UserDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.userService.updateAvatar(userId, file);
  }

  @Roles(ADMIN_ROLE_NAME)
  @Get('count-user')
  @ApiCommonResponses('Lấy ra số lượng user')
  getCountUser(): Promise<UserCountDto> {
    return this.userService.getCountUser();
  }

  @Get()
  @ApiCommonResponses('Lấy ra danh sách user')
  @CommonPagination(USER_SORT_FIELDS)
  getAll(
    @Pagination() params: PaginationParams,
  ): Promise<Paginated<SafeUserRow>> {
    return this.userService.getAll(params);
  }

  @Get(':id')
  @ApiCommonResponses('Lấy ra thông tin chi tiết user')
  getDetail(@Param('id') id: string): Promise<UserDto> {
    return this.userService.getDetail(id);
  }

  @Roles(ADMIN_ROLE_NAME)
  @Put(':id/role')
  @ApiCommonResponses('Cập nhật role cho user')
  @ResponseMessage('User role updated successfully')
  updateUserRole(
    @Param('id') id: string,
    @Body() data: UpdateUserRoleDto,
    @CurrentUserId() currentUserId: string,
  ): Promise<UserDto> {
    return this.userService.updateUserRole(id, data.roleId, currentUserId);
  }

  @Roles(ADMIN_ROLE_NAME)
  @Delete(':id')
  @ApiCommonResponses('Xóa user')
  @ResponseMessage('Xóa user thành công')
  deleteUser(
    @Param('id') id: string,
    @CurrentUserId() currentUserId: string,
  ): Promise<void> {
    return this.userService.deleteUser(id, currentUserId);
  }
}
