import { Body, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Role } from '@prisma/client';

import { ApiCommonResponses } from '@/shared/decorators/api-common-responses.decorator';
import { AuthenticatedController } from '@/shared/decorators/authenticated-controller.decorator';
import { CommonPagination } from '@/shared/decorators/common-pagination.decorator';
import { Pagination } from '@/shared/decorators/pagination.decorator';
import { ResponseMessage } from '@/shared/decorators/response-message.decorator';
import { Roles } from '@/shared/decorators/roles.decorator';
import { Paginated } from '@/shared/pagination/paginated';
import { PaginationParams } from '@/shared/pagination/pagination-params';

import { CreateRoleDto } from './dto/create-role.dto';
import { ADMIN_ROLE_NAME, ROLE_SORT_FIELDS } from './role.constants';
import { RoleService } from './role.service';

@ApiTags('Role')
@AuthenticatedController('role')
@Roles(ADMIN_ROLE_NAME)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @ApiCommonResponses('Tạo mới role')
  @ResponseMessage('Role created successfully')
  createRole(@Body() data: CreateRoleDto): Promise<Role> {
    return this.roleService.createRole(data);
  }

  @Get()
  @ApiCommonResponses('Lấy tất cả các role')
  @CommonPagination(ROLE_SORT_FIELDS)
  getRoles(@Pagination() params: PaginationParams): Promise<Paginated<Role>> {
    return this.roleService.getRoles(params);
  }

  @Delete(':id')
  @ApiCommonResponses('Xóa role')
  @ResponseMessage('Role deleted successfully')
  deleteRole(@Param('id') id: string): Promise<void> {
    return this.roleService.deleteRole(id);
  }
}
