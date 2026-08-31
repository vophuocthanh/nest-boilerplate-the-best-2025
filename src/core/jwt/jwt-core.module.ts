import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

/**
 * Cấu hình ký/verify JWT — khai báo MỘT LẦN cho toàn app.
 *
 * Trước đây khối `JwtModule.registerAsync` này bị copy y hệt ở AuthModule và
 * MessagesModule; đổi thuật toán ký mà quên một chỗ sẽ khiến WebSocket và HTTP
 * lệch nhau theo cách rất khó truy vết.
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.accessSecret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.accessExpiresIn'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [JwtModule],
})
export class JwtCoreModule {}
