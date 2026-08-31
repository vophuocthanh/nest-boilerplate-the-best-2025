/**
 * Hình dạng của user sau khi JwtStrategy xác thực xong và gắn vào `request.user`.
 *
 * CHỦ Ý chỉ chứa đúng những gì được ký trong access token — không phải toàn bộ
 * bản ghi `User` của Prisma. Trước đây `express.d.ts` khai báo `user?: User`
 * (entity đầy đủ) trong khi thực tế Passport chỉ gắn payload của token, khiến
 * TypeScript "hứa" nhiều field không hề tồn tại lúc runtime.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
}
