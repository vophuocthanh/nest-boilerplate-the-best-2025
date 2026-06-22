import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { MessagesGateway } from '@app/src/modules/messages/messages.gateway';
import { MessageService } from '@app/src/modules/messages/messages.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.accessSecret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.accessExpiresIn'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [MessagesGateway, MessageService],
  exports: [MessageService],
})
export class MessagesModule {}
