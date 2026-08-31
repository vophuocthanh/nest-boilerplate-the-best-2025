/** Role được gán mặc định cho user mới đăng ký. */
export const DEFAULT_ROLE_NAME = 'USER';

/** Role quản trị — không cho phép xoá tài khoản mang role này. */
export const ADMIN_ROLE_NAME = 'ADMIN';

/** Field được phép dùng cho `sortBy` khi liệt kê role. */
export const ROLE_SORT_FIELDS = ['name'] as const;
