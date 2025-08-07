import { UseGuards } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';

import { WsJwtAuthGuard } from '@app/src/auth/guards/ws-jwt-auth.guard';
import { MessageService } from '@app/src/modules/messages/messages.service';

// Các events chính trong hệ thống:
// sendMessage: Gửi tin nhắn mới
// newMessage: Nhận tin nhắn mới (cho người nhận)
// messageSent: Xác nhận tin nhắn đã gửi thành công (cho người gửi)
// markAsRead: Đánh dấu tin nhắn đã đọc
// messageRead: Thông báo tin nhắn đã được đọc (cho người gửi)

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MessagesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private connectedClients: Map<string, Socket> = new Map();

  constructor(private readonly messageService: MessageService) {}

  async handleConnection(client: Socket) {
    try {
      const userId = client.handshake.auth.userId;
      if (userId) {
        this.connectedClients.set(userId, client);
        console.log(`Client connected: ${userId}`);
      }
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.handshake.auth.userId;
    if (userId) {
      this.connectedClients.delete(userId);
      console.log(`Client disconnected: ${userId}`);
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('sendMessage')
  async handleMessage(
    client: Socket,
    payload: { content: string; receiverId: string },
  ) {
    const senderId = client.handshake.auth.userId;
    const { content, receiverId } = payload;

    try {
      const message = await this.messageService.createMessage({
        content,
        senderId,
        receiverId,
      });

      // Send to receiver if online
      const receiverSocket = this.connectedClients.get(receiverId);
      if (receiverSocket) {
        receiverSocket.emit('newMessage', message);
      }

      // Send confirmation to sender
      client.emit('messageSent', message);

      return message;
    } catch (error) {
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(client: Socket, messageId: string) {
    const userId = client.handshake.auth.userId;
    try {
      const message = await this.messageService.markMessageAsRead(
        messageId,
        userId,
      );

      // Notify sender that their message was read
      const senderSocket = this.connectedClients.get(message.senderId);
      if (senderSocket) {
        senderSocket.emit('messageRead', { messageId, readBy: userId });
      }

      return message;
    } catch (error) {
      client.emit('error', { message: 'Failed to mark message as read' });
    }
  }
}
