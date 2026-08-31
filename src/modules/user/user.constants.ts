import { Prisma } from '@prisma/client';

/**
 * Whitelist field an toàn để trả ra client, dùng ngay ở tầng query.
 *
 * Đặt tại module `user` (chủ sở hữu aggregate) chứ không phải `config/` —
 * đây là hợp đồng dữ liệu của một module, không phải giá trị đến từ môi trường.
 */
export const USER_SAFE_SELECT = {
  id: true,
  email: true,
  phone: true,
  address: true,
  avatar: true,
  name: true,
  date_of_birth: true,
  country: true,
  createAt: true,
  updateAt: true,
  isVerified: true,
  role: { select: { name: true } },
} satisfies Prisma.UserSelect;

/** Field được phép dùng cho `sortBy` khi liệt kê user. */
export const USER_SORT_FIELDS = [
  'createAt',
  'updateAt',
  'name',
  'email',
] as const;
