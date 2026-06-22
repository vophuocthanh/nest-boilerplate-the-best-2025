import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from 'src/decorator/roles.decorator';
import { RequestWithUser } from 'src/types/users';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // Route không khai báo @Roles -> không giới hạn theo role
    if (!roles || roles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<RequestWithUser>();

    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenException('Bạn không có quyền truy cập');
    }

    return true;
  }
}
