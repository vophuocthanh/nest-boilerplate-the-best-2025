import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { CreateMessageDto } from '@app/src/modules/messages/dto/create-message.dto';
import { PrismaService } from '@app/src/prisma/prisma.service';

const MESSAGE_PARTICIPANT_SELECT = { id: true, name: true, avatar: true };
const MESSAGE_INCLUDE = {
  sender: { select: MESSAGE_PARTICIPANT_SELECT },
  receiver: { select: MESSAGE_PARTICIPANT_SELECT },
} satisfies Prisma.MessageInclude;

const DEFAULT_MESSAGES_LIMIT = 50;

@Injectable()
export class MessageService {
  constructor(private prisma: PrismaService) {}

  async createMessage(senderId: string, createMessageDto: CreateMessageDto) {
    const { content, receiverId } = createMessageDto;

    const receiver = await this.prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true },
    });
    if (!receiver) {
      throw new NotFoundException('Receiver not found');
    }

    return this.prisma.message.create({
      data: { content, senderId, receiverId },
      include: MESSAGE_INCLUDE,
    });
  }

  async getMessages(
    userId: string,
    otherUserId: string,
    take: number = DEFAULT_MESSAGES_LIMIT,
    skip: number = 0,
  ) {
    return this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
      include: MESSAGE_INCLUDE,
      orderBy: { createdAt: 'asc' },
      take,
      skip,
    });
  }

  async markMessageAsRead(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }
    if (message.receiverId !== userId) {
      throw new ForbiddenException('You cannot mark this message as read');
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async getUnreadMessagesCount(userId: string) {
    return this.prisma.message.count({
      where: {
        receiverId: userId,
        isRead: false,
      },
    });
  }
}
