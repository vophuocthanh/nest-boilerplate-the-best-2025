import { Logger } from '@nestjs/common';

import { NextFunction, Request, Response } from 'express';

const logger = new Logger('HTTP');

const useColor = process.env.NODE_ENV !== 'production';
const color = (code: string) => (useColor ? code : '');

const RESET = color('\x1b[0m');
const DIM = color('\x1b[2m');

const methodColor = (method: string): string => {
  switch (method) {
    case 'GET':
      return color('\x1b[32m');
    case 'POST':
      return color('\x1b[33m');
    case 'PUT':
      return color('\x1b[34m');
    case 'DELETE':
      return color('\x1b[31m');
    case 'PATCH':
      return color('\x1b[35m');
    default:
      return color('\x1b[37m');
  }
};

const statusColor = (statusCode: number): string => {
  if (statusCode < 300) return color('\x1b[32m');
  if (statusCode < 400) return color('\x1b[33m');
  return color('\x1b[31m');
};

const durationColor = (duration: number): string => {
  if (duration < 100) return color('\x1b[32m');
  if (duration < 500) return color('\x1b[38;5;208m');
  return color('\x1b[31m');
};

export const loggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const start = Date.now();
  const { method, originalUrl, ip } = req;
  // Correlation id (gắn bởi requestIdMiddleware) để nối 2 dòng log của cùng request
  const rid = req.id ? `${DIM}[${req.id}]${RESET} ` : '';

  const mColor = methodColor(method);
  logger.log(
    `${rid}${mColor}${method.padEnd(
      6,
    )}${RESET} ${originalUrl} ${DIM}${ip}${RESET}`,
  );

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const timing = `${durationColor(duration)}${
      duration >= 100 ? '+' : ''
    }${duration}ms${RESET}`;
    logger.log(
      `${rid}${statusColor(
        statusCode,
      )}${statusCode}${RESET} ${mColor}${method.padEnd(
        6,
      )}${RESET} ${originalUrl} ${timing}`,
    );
  });

  next();
};
