import { Role, User } from '@prisma/client';

import { UserDto } from './dto/user-response.dto';

type UserWithOptionalRole = User & { role?: Pick<Role, 'name'> | null };

/**
 * Nguồn sự thật DUY NHẤT cho hình dạng user trả ra client.
 *
 * Đây là WHITELIST: thêm field nhạy cảm mới vào `schema.prisma` sẽ mặc định
 * KHÔNG lộ ra ngoài. Cách cũ (`ResponseUtil.formatUserResponse`) là blacklist —
 * chỉ `delete` 4 trong 20 field, nên `resetToken`, `googleId`, `lockedUntil`,
 * `failedLoginAttempts` vẫn bị trả về, và endpoint nào quên gọi sanitize thì
 * trả nguyên cả `password` hash.
 */
export function toUserDto(user: UserWithOptionalRole): UserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    address: user.address,
    avatar: user.avatar,
    date_of_birth: user.date_of_birth,
    country: user.country,
    isVerified: user.isVerified,
    role: user.role?.name ?? null,
    createAt: user.createAt,
    updateAt: user.updateAt,
  };
}
