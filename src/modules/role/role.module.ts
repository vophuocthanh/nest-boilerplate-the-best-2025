import { Module } from '@nestjs/common';

import { RoleController } from './role.controller';
import { RoleRepository } from './role.repository';
import { RoleService } from './role.service';

@Module({
  controllers: [RoleController],
  providers: [RoleService, RoleRepository],
  // AuthModule cần đọc role mặc định khi tạo user -> đi qua repository của Role,
  // thay vì tự query bảng `roles`.
  exports: [RoleRepository],
})
export class RoleModule {}
