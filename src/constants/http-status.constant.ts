import { HttpStatus } from '@nestjs/common';

export const HTTP_STATUS_MESSAGE = {
  // Success responses (2xx)
  OK: {
    code: HttpStatus.OK,
    message: 'Success',
  },
  CREATED: {
    code: HttpStatus.CREATED,
    message: 'Created successfully',
  },
  ACCEPTED: {
    code: HttpStatus.ACCEPTED,
    message: 'Request accepted',
  },
  NO_CONTENT: {
    code: HttpStatus.NO_CONTENT,
    message: 'No content',
  },

  // Client error responses (4xx)
  BAD_REQUEST: {
    code: HttpStatus.BAD_REQUEST,
    message: 'Bad request',
  },
  UNAUTHORIZED: {
    code: HttpStatus.UNAUTHORIZED,
    message: 'Unauthorized',
  },
  FORBIDDEN: {
    code: HttpStatus.FORBIDDEN,
    message: 'Access denied',
  },
  NOT_FOUND: {
    code: HttpStatus.NOT_FOUND,
    message: 'Resource not found',
  },
  METHOD_NOT_ALLOWED: {
    code: HttpStatus.METHOD_NOT_ALLOWED,
    message: 'Method not allowed',
  },
  CONFLICT: {
    code: HttpStatus.CONFLICT,
    message: 'Data conflict',
  },
  UNPROCESSABLE_ENTITY: {
    code: HttpStatus.UNPROCESSABLE_ENTITY,
    message: 'Invalid data',
  },
  TOO_MANY_REQUESTS: {
    code: HttpStatus.TOO_MANY_REQUESTS,
    message: 'Too many requests',
  },

  // Server error responses (5xx)
  INTERNAL_SERVER_ERROR: {
    code: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Internal server error',
  },
  NOT_IMPLEMENTED: {
    code: HttpStatus.NOT_IMPLEMENTED,
    message: 'Feature not implemented',
  },
  BAD_GATEWAY: {
    code: HttpStatus.BAD_GATEWAY,
    message: 'Bad gateway',
  },
  SERVICE_UNAVAILABLE: {
    code: HttpStatus.SERVICE_UNAVAILABLE,
    message: 'Service unavailable',
  },

  // Custom status codes for specific business logic
  INVALID_CREDENTIALS: {
    code: HttpStatus.UNAUTHORIZED,
    message: 'Invalid login credentials',
  },
  TOKEN_EXPIRED: {
    code: HttpStatus.UNAUTHORIZED,
    message: 'Token has expired',
  },
  ACCOUNT_DISABLED: {
    code: HttpStatus.FORBIDDEN,
    message: 'Account has been disabled',
  },
  EMAIL_ALREADY_EXISTS: {
    code: HttpStatus.CONFLICT,
    message: 'Email already exists',
  },
  INVALID_RESET_PASSWORD_TOKEN: {
    code: HttpStatus.BAD_REQUEST,
    message: 'Invalid password reset token',
  },
  PASSWORD_MISMATCH: {
    code: HttpStatus.BAD_REQUEST,
    message: 'Passwords do not match',
  },
};
