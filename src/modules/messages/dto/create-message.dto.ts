import { ApiProperty } from '@nestjs/swagger';

import { IsNotEmpty, IsString } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({
    description: 'The content of the message',
    example: 'Hello, how are you?',
  })
  @IsString()
  @IsNotEmpty()
  content!: string;

  // KHÔNG nhận senderId từ client — luôn lấy từ user đã xác thực (chống spoofing).
  @ApiProperty({
    description: 'The ID of the receiver',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  receiverId!: string;
}
