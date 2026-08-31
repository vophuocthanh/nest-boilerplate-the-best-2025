import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { compare, hash } from 'bcrypt';

/** Cost factor mặc định của bcrypt (an toàn cho 2026) nếu env không khai báo. */
const DEFAULT_BCRYPT_ROUNDS = 12;

/**
 * Bọc bcrypt kèm cost factor đọc từ config.
 *
 * Trước đây RegistrationService và PasswordService mỗi bên tự đọc config rồi tự
 * gọi `hash(x, rounds)` — hai bản sao của cùng một quyết định bảo mật.
 */
@Injectable()
export class PasswordHasher {
  private readonly rounds: number;

  constructor(configService: ConfigService) {
    this.rounds =
      configService.get<number>('security.bcryptSaltRounds') ??
      DEFAULT_BCRYPT_ROUNDS;
  }

  hash(plain: string): Promise<string> {
    return hash(plain, this.rounds);
  }

  compare(plain: string, hashed: string): Promise<boolean> {
    return compare(plain, hashed);
  }
}
