import {
  ExecutionContext,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';

import { Request } from 'express';

import { AuthenticatedUser } from '@/shared/types/authenticated-user';

/** Trả về user đã xác thực (gắn vào request bởi JwtStrategy); ném 401 nếu không có. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const { user } = ctx.switchToHttp().getRequest<Request>();
    if (!user) {
      throw new UnauthorizedException('User not found in request');
    }
    return user;
  },
);

/** Trả về id của user đã xác thực; ném 401 nếu không có. */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const { user } = ctx.switchToHttp().getRequest<Request>();
    if (!user?.id) {
      throw new UnauthorizedException('User ID not found in request');
    }
    return user.id;
  },
);
