import { Module } from '@nestjs/common';

import { JwtCoreModule } from '@/core/jwt/jwt-core.module';
import { UserModule } from '@/modules/user/user.module';

import { MessagesGateway } from './messages.gateway';
import { MessageService } from './messages.service';

@Module({
  // JwtCoreModule thay cho khối JwtModule.registerAsync từng bị copy y hệt từ
  // AuthModule — cấu hình ký JWT giờ chỉ tồn tại một bản.
  imports: [JwtCoreModule, UserModule],
  providers: [MessagesGateway, MessageService],
  exports: [MessageService],
})
export class MessagesModule {}
