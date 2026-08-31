import { Module } from '@nestjs/common';

import { StorageModule } from '@/integrations/storage/storage.module';
import { RoleModule } from '@/modules/role/role.module';

import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

@Module({
  imports: [StorageModule, RoleModule],
  controllers: [UserController],
  providers: [UserService, UserRepository],
  // Module khác (auth, messages) chạm bảng `users` qua repository này,
  // thay vì gọi thẳng PrismaService.
  exports: [UserRepository],
})
export class UserModule {}
