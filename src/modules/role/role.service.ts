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
    const where = {
      name: {
        contains: search,
        mode: 'insensitive' as const,
      },
    };

    const [data, total] = await Promise.all([
      this.prisma.role.findMany({ where }),
      this.prisma.role.count({ where }),
    ]);

    return { data, total };
  }

  async deleteRole(id: string) {
    return this.prisma.role.delete({ where: { id } });
  }
}
