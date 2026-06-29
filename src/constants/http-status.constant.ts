import { HttpStatus } from '@nestjs/common';

export const HTTP_STATUS_MESSAGE = {
  OK: {
    code: HttpStatus.OK,
    message: 'Success',
  },
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
  INTERNAL_SERVER_ERROR: {
    code: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Internal server error',
  },
};
