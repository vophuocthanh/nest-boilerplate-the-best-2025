import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '@app/src/helpers/prisma.service';
import { RoleController } from '@app/src/modules/role/role.controller';
import { RoleService } from '@app/src/modules/role/role.service';

@Module({
  controllers: [RoleController],
  providers: [RoleService, PrismaService, JwtService],
})
export class RoleModule {}
