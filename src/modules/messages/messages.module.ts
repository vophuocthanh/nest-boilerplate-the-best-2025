import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { PrismaService } from '@app/src/helpers/prisma.service';
import { MessagesGateway } from '@app/src/modules/messages/messages.gateway';
import { MessageService } from '@app/src/modules/messages/messages.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [MessagesGateway, MessageService, PrismaService],
  exports: [MessageService],
})
export class MessagesModule {}
