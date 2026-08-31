/// <reference types="multer" />
import { AuthenticatedUser } from './authenticated-user';

declare global {
  namespace Express {
    /**
     * `@types/passport` khai báo `Request.user?: Express.User` với `User` là một
     * interface rỗng. Mở rộng chính `Express.User` (thay vì khai báo lại
     * `Request.user`) để `req.user` có kiểu thật ở mọi nơi mà không xung đột.
     */
    interface User extends AuthenticatedUser {}

    interface Request {
      /** Correlation id gắn bởi requestIdMiddleware. */
      id?: string;
    }
  }
}
