import { Injectable } from '@nestjs/common';

import { Prisma, Role } from '@prisma/client';

import { PrismaService } from '@/core/database/prisma.service';
import { paginate } from '@/shared/pagination/paginate';
import { Paginated } from '@/shared/pagination/paginated';
import { PaginationParams } from '@/shared/pagination/pagination-params';

import { ROLE_SORT_FIELDS } from './role.constants';

/** Nơi DUY NHẤT truy vấn bảng `roles`. */
@Injectable()
export class RoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.RoleCreateInput): Promise<Role> {
    return this.prisma.role.create({ data });
  }

  findByName(name: string): Promise<Role | null> {
    return this.prisma.role.findUnique({ where: { name } });
  }

  findById(id: string): Promise<Role | null> {
    return this.prisma.role.findUnique({ where: { id } });
  }

  delete(id: string): Promise<Role> {
    return this.prisma.role.delete({ where: { id } });
  }

  paginate(params: PaginationParams): Promise<Paginated<Role>> {
    const where: Prisma.RoleWhereInput = params.search
      ? { name: { contains: params.search, mode: 'insensitive' } }
      : {};

    return paginate<Role, Prisma.RoleWhereInput>(this.prisma.role, params, {
      where,
      allowedSortFields: ROLE_SORT_FIELDS,
      defaultSortField: 'name',
    });
  }
}
