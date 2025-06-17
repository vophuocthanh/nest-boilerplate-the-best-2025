import { Module } from '@nestjs/common';
import { MessagesGateway } from './messages.gateway';
import { MessageService } from './messages.service';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '@app/src/helpers/prisma.service';
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
