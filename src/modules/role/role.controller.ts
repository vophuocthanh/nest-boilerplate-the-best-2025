import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { ApiCommonResponses } from 'src/decorator/api-common-responses.decorator';
import { CommonPagination } from 'src/decorator/common-pagination.decorator';
import { Roles } from 'src/decorator/roles.decorator';
import { CreateRoleDto } from 'src/modules/role/dto/create.dto';
import { RoleDto } from 'src/modules/role/dto/role.dto';
import { RoleService } from 'src/modules/role/role.service';

@ApiBearerAuth()
@ApiTags('Role')
@Controller('role')
export class RoleController {
  constructor(private rolesService: RoleService) {}

  @Roles('ADMIN')
  @ApiCommonResponses('Tạo mới role')
  @Post()
  async createRole(@Body() data: CreateRoleDto) {
    return this.rolesService.createRole(data);
  }

  @CommonPagination()
  @Get()
  @ApiCommonResponses('Lấy tất cả các role')
  async getRoles(@Query() filter: RoleDto) {
    return this.rolesService.getRoles(filter);
  }

  @Roles('ADMIN')
  @Delete(':id')
  @ApiCommonResponses('Xóa role')
  async deleteRole(@Param('id') id: string) {
    return this.rolesService.deleteRole(id);
  }
}
