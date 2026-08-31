import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { Request } from 'express';

import { ROLES_KEY } from '@/shared/decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // Route không khai báo @Roles -> không giới hạn theo role.
    if (!roles?.length) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<Request>();
    if (!user?.role || !roles.includes(user.role)) {
      throw new ForbiddenException('Bạn không có quyền truy cập');
    }

    return true;
  }
}
