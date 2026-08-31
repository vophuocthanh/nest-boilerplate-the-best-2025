import { Injectable, NotFoundException } from '@nestjs/common';

import { Role } from '@prisma/client';

import { Paginated } from '@/shared/pagination/paginated';
import { PaginationParams } from '@/shared/pagination/pagination-params';

import { CreateRoleDto } from './dto/create-role.dto';
import { RoleRepository } from './role.repository';

@Injectable()
export class RoleService {
  constructor(private readonly roleRepository: RoleRepository) {}

  createRole(data: CreateRoleDto): Promise<Role> {
    return this.roleRepository.create(data);
  }

  getRoles(params: PaginationParams): Promise<Paginated<Role>> {
    return this.roleRepository.paginate(params);
  }

  async deleteRole(id: string): Promise<void> {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    await this.roleRepository.delete(id);
  }
}
