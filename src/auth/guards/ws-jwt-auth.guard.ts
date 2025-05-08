import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient<Socket>();
      const token = client.handshake.auth.token;

      if (!token) {
        throw new WsException('Unauthorized');
      }

      const payload = this.jwtService.verify(token);
      client.handshake.auth.userId = payload.sub;

      return true;
    } catch (err) {
      throw new WsException('Unauthorized');
    }
  }
}
