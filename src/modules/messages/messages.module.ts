import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { MessagesGateway } from '@app/src/modules/messages/messages.gateway';
import { MessageService } from '@app/src/modules/messages/messages.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.ACCESS_TOKEN_KEY,
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [MessagesGateway, MessageService],
  exports: [MessageService],
})
export class MessagesModule {}
