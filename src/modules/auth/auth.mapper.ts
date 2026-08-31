import { UserWithRole } from '@/modules/user/user.repository';

import { SafeUser } from './types/auth.types';

/**
 * Rút gọn user thành phần thông tin kèm trong kết quả đăng nhập.
 *
 * Cố ý tách khỏi `toUserDto` của module user: đây là hợp đồng của response
 * đăng nhập (chỉ 4 field), không phải hồ sơ người dùng đầy đủ.
 */
export function toSafeUser(user: UserWithRole): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role?.name ?? null,
  };
}
