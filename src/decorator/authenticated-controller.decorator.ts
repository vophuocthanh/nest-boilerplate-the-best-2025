import { Controller, applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';

export const AuthenticatedController = (
  path?: string | string[],
): ClassDecorator =>
  applyDecorators(
    path === undefined ? Controller() : Controller(path),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
