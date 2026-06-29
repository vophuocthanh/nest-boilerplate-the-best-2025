import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';

import { getCorsOrigin } from '@app/src/common/config/cors.config';
import { MessageService } from '@app/src/modules/messages/messages.service';

// Các events chính trong hệ thống:
// sendMessage: Gửi tin nhắn mới
// newMessage: Nhận tin nhắn mới (cho người nhận)
// messageSent: Xác nhận tin nhắn đã gửi thành công (cho người gửi)
// markAsRead: Đánh dấu tin nhắn đã đọc
// messageRead: Thông báo tin nhắn đã được đọc (cho người gửi)

@WebSocketGateway({
  cors: {
    origin: getCorsOrigin(),
  },
})
export class MessagesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MessagesGateway.name);
  private connectedClients: Map<string, Set<Socket>> = new Map();

  private emitToUser(userId: string, event: string, payload: unknown): void {
    const sockets = this.connectedClients.get(userId);
    if (!sockets) return;
    for (const socket of sockets) {
      socket.emit(event, payload);
    }
  }

  constructor(
    private readonly messageService: MessageService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ??
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        throw new Error('Missing authentication token');
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.accessSecret'),
      });
      const userId = payload.id;

      // Lưu userId đã xác thực vào handshake để các handler khác dùng lại
      client.handshake.auth.userId = userId;
      const sockets = this.connectedClients.get(userId) ?? new Set<Socket>();
      sockets.add(client);
      this.connectedClients.set(userId, sockets);
      this.logger.log(`Client connected: ${userId}`);
    } catch (error) {
      this.logger.warn(
        `Rejected socket connection: ${(error as Error).message}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.handshake.auth.userId;
    if (!userId) return;

    const sockets = this.connectedClients.get(userId);
    if (sockets) {
      sockets.delete(client);
      // Chỉ xoá key khi user không còn thiết bị nào online.
      if (sockets.size === 0) {
        this.connectedClients.delete(userId);
      }
    }
    this.logger.log(`Client disconnected: ${userId}`);
  }

  // Lấy userId đã xác thực ở handleConnection; socket chưa auth đã bị disconnect.
  private getAuthedUserId(client: Socket): string {
    const userId = client.handshake.auth.userId;
    if (!userId) {
      throw new WsException('Unauthorized');
    }
    return userId;
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    client: Socket,
    payload: { content: string; receiverId: string },
  ) {
    const senderId = this.getAuthedUserId(client);
    const content = payload?.content?.trim();
    const receiverId = payload?.receiverId;

    // Validate payload tối thiểu (gateway không đi qua ValidationPipe của HTTP).
    if (!content || !receiverId) {
      client.emit('error', { message: 'content và receiverId là bắt buộc' });
      return;
    }
    if (receiverId === senderId) {
      client.emit('error', {
        message: 'Không thể gửi tin nhắn cho chính mình',
      });
      return;
    }

    try {
      const message = await this.messageService.createMessage({
        content,
        senderId,
        receiverId,
      });

      // Gửi tới mọi thiết bị của người nhận đang online
      this.emitToUser(receiverId, 'newMessage', message);

      // Send confirmation to sender
      client.emit('messageSent', message);

      return message;
    } catch (error) {
      this.logger.error(
        `sendMessage failed (sender=${senderId})`,
        error instanceof Error ? error.stack : String(error),
      );
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(client: Socket, messageId: string) {
    const userId = this.getAuthedUserId(client);
    if (!messageId) {
      client.emit('error', { message: 'messageId là bắt buộc' });
      return;
    }
    try {
      const message = await this.messageService.markMessageAsRead(
        messageId,
        userId,
      );

      // Báo cho mọi thiết bị của người gửi rằng tin nhắn đã được đọc
      this.emitToUser(message.senderId, 'messageRead', {
        messageId,
        readBy: userId,
      });

      return message;
    } catch (error) {
      this.logger.error(
        `markAsRead failed (user=${userId})`,
        error instanceof Error ? error.stack : String(error),
      );
      client.emit('error', { message: 'Failed to mark message as read' });
    }
  }
}
