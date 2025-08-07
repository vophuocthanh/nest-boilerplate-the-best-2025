import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

import { HTTP_STATUS_MESSAGE } from '@app/src/constants/http-status.constant';

/**
 * Decorator used to add API description (summary) and general responses
 * @param summary - Describes the API function
 */
export function ApiCommonResponses(summary: string) {
  return applyDecorators(
    ApiOperation({ summary }),
    // Success Response
    ApiResponse({
      status: HTTP_STATUS_MESSAGE.OK.code,
      description: HTTP_STATUS_MESSAGE.OK.message,
    }),
    // Bad Request Response
    ApiResponse({
      status: HTTP_STATUS_MESSAGE.BAD_REQUEST.code,
      description: HTTP_STATUS_MESSAGE.BAD_REQUEST.message,
    }),
    // Unauthorized Response
    ApiResponse({
      status: HTTP_STATUS_MESSAGE.UNAUTHORIZED.code,
      description: HTTP_STATUS_MESSAGE.UNAUTHORIZED.message,
    }),
    // Forbidden Response
    ApiResponse({
      status: HTTP_STATUS_MESSAGE.FORBIDDEN.code,
      description: HTTP_STATUS_MESSAGE.FORBIDDEN.message,
    }),
    // Not Found Response
    ApiResponse({
      status: HTTP_STATUS_MESSAGE.NOT_FOUND.code,
      description: HTTP_STATUS_MESSAGE.NOT_FOUND.message,
    }),
    // Internal Server Error Response
    ApiResponse({
      status: HTTP_STATUS_MESSAGE.INTERNAL_SERVER_ERROR.code,
      description: HTTP_STATUS_MESSAGE.INTERNAL_SERVER_ERROR.message,
    }),
  );
}
