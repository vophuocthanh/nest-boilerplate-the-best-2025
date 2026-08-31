import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '@/core/database/prisma.service';
import { UserRepository } from '@/modules/user/user.repository';

import { CreateMessageDto } from './dto/create-message.dto';

const MESSAGE_PARTICIPANT_SELECT = { id: true, name: true, avatar: true };
const MESSAGE_INCLUDE = {
  sender: { select: MESSAGE_PARTICIPANT_SELECT },
  receiver: { select: MESSAGE_PARTICIPANT_SELECT },
} satisfies Prisma.MessageInclude;

const DEFAULT_MESSAGES_LIMIT = 50;

@Injectable()
export class MessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
  ) {}

  async createMessage(senderId: string, dto: CreateMessageDto) {
    // Kiểm tra người nhận qua repository của module user — module này không
    // chạm trực tiếp vào bảng `users`.
    if (!(await this.userRepository.exists(dto.receiverId))) {
      throw new NotFoundException('Receiver not found');
    }

    return this.prisma.message.create({
      data: {
        content: dto.content,
        senderId,
        receiverId: dto.receiverId,
      },
      include: MESSAGE_INCLUDE,
    });
  }

  getMessages(
    userId: string,
    otherUserId: string,
    take: number = DEFAULT_MESSAGES_LIMIT,
    skip = 0,
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
      data: { isRead: true, readAt: new Date() },
    });
  }

  getUnreadMessagesCount(userId: string): Promise<number> {
    return this.prisma.message.count({
      where: { receiverId: userId, isRead: false },
    });
  }
}
