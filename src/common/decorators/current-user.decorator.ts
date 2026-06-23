import {
  ExecutionContext,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';

import { RequestWithUser } from '@app/src/types/users';

/** Trả về toàn bộ user đã được xác thực (gắn vào request bởi JwtStrategy). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);

/** Trả về id của user đã xác thực; ném 401 nếu không có. */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    if (!request.user?.id) {
      throw new UnauthorizedException('User ID not found in request');
    }
    return request.user.id;
  },
);
