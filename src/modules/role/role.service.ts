import { Injectable } from '@nestjs/common';

import { PrismaService } from '@app/src/helpers/prisma.service';
import { CreateRoleDto } from '@app/src/modules/role/dto/create.dto';
import { RoleDto, RoleResponseType } from '@app/src/modules/role/dto/role.dto';

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

  async createRole(data: CreateRoleDto) {
    return this.prisma.role.create({ data });
  }

  async getRoles(filter: RoleDto): Promise<RoleResponseType> {
    const search = filter.search || '';

    const roles = await this.prisma.role.findMany({
      where: {
        name: {
          contains: search,
          mode: 'insensitive',
        },
      },
    });

    const total = await this.prisma.role.count({
      where: {
        name: {
          contains: search,
          mode: 'insensitive',
        },
      },
    });

    return {
      data: roles,
      total,
    };
  }

  async deleteRole(id: string) {
    return this.prisma.role.delete({ where: { id } });
  }
}
