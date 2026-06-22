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

import { User } from '@prisma/client';

import { ApiCommonResponses } from 'src/decorator/api-common-responses.decorator';
import { AuthenticatedController } from 'src/decorator/authenticated-controller.decorator';
import { CommonPagination } from 'src/decorator/common-pagination.decorator';
import { CurrentUserId } from 'src/decorator/current-user-id.decorator';
import { Roles } from 'src/decorator/roles.decorator';
import {
  UpdateUserDto,
  UpdateUserRoleDto,
} from 'src/modules/user/dto/user.dto';

import { PaginationParams } from '@app/src/core/model/pagination-params';
import { CommonQuery } from '@app/src/decorator/common-query.decorator';
import { Pagination } from '@app/src/decorator/pagination.decorator';
import { UserService } from '@app/src/modules/user/user.service';

@ApiTags('User')
@AuthenticatedController('user')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('me')
  @ApiCommonResponses('Lấy ra thông tin user đang đăng nhập')
  async getCurrentUser(
    @CurrentUserId() userId: string,
  ): Promise<Required<Omit<User, 'password' | 'confirmPassword'>>> {
    const user = await this.userService.getDetail(userId);
    return user as Required<Omit<User, 'password' | 'confirmPassword'>>;
  }

  @Get('/count-user')
  @ApiCommonResponses('Lấy ra số lượng user')
  async countUser(): Promise<{ data: { total: number } }> {
    return this.userService.getCountUser();
  }

  @CommonQuery('sort', 'Sort order (asc or desc)', ['asc', 'desc'])
  @CommonQuery('sortBy', 'Field to sort by', ['createAt'])
  @Get()
  @ApiCommonResponses('Lấy ra danh sách user')
  @CommonPagination()
  getAll(@Pagination(['sortBy']) params: PaginationParams) {
    return this.userService.getAll(params);
  }

  @Get(':id')
  @ApiCommonResponses('Lấy ra thông tin chi tiết user')
  getDetail(
    @Param('id') id: string,
  ): Promise<Required<Omit<User, 'password' | 'confirmPassword'>>> {
    return this.userService.getDetail(id) as Promise<
      Required<Omit<User, 'password' | 'confirmPassword'>>
    >;
  }

  @Roles('ADMIN')
  @Put(':id/role')
  @ApiCommonResponses('Cập nhật role cho user')
  async updateUserRole(
    @Param('id') id: string,
    @Body() data: UpdateUserRoleDto,
    @CurrentUserId() userId: string,
  ) {
    return this.userService.updateUserRole(id, data.roleId, userId);
  }

  @Put('me')
  @ApiCommonResponses('Cập nhật thông tin user đang đăng nhập')
  async updateMe(@CurrentUserId() userId: string, @Body() data: UpdateUserDto) {
    return this.userService.updateMeUser(data, userId);
  }

  @Post('upload-avatar')
  @ApiCommonResponses('Upload user avatar')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatarS3(
    @CurrentUserId() userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return await this.userService.updateAvatarS3(userId, file);
  }

  @Roles('ADMIN')
  @Delete(':id')
  @ApiCommonResponses('Xóa user')
  async deleteUser(
    @Param('id') id: string,
    @CurrentUserId() currentUserId: string,
  ): Promise<{ message: string }> {
    return this.userService.deleteUser(id, currentUserId);
  }
}
