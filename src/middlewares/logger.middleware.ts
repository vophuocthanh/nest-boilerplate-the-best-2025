import { NextFunction, Request, Response } from 'express';

export const loggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  // Colors
  const resetColor = '\x1b[0m';
  const dimColor = '\x1b[2m';
  const cyanColor = '\x1b[36m';
  const orangeColor = '\x1b[38;5;208m'; // Orange color

  const getMethodColor = (method: string): string => {
    switch (method) {
      case 'GET':
        return '\x1b[32m'; // Green
      case 'POST':
        return '\x1b[33m'; // Yellow
      case 'PUT':
        return '\x1b[34m'; // Blue
      case 'DELETE':
        return '\x1b[31m'; // Red
      case 'PATCH':
        return '\x1b[35m'; // Purple
      default:
        return '\x1b[37m'; // White
    }
  };

  const getStatusColor = (statusCode: number): string => {
    if (statusCode < 300) return '\x1b[32m'; // Green
    if (statusCode < 400) return '\x1b[33m'; // Yellow
    if (statusCode < 500) return '\x1b[31m'; // Red
    return '\x1b[31m'; // Red
  };

  const formatTimestamp = (): string => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const date = `${day}/${month}/${year}`;
    const time = now.toLocaleTimeString('en-US', {
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    return `${date}, ${time}`;
  };

  // Log request
  const methodColor = getMethodColor(method);
  const timestamp = formatTimestamp();
  const logLevel = cyanColor + 'LOG REQUEST' + resetColor;

  console.log(
    `${dimColor}[${logLevel}]${resetColor} ${dimColor}${timestamp}${resetColor} ${methodColor}${method.padEnd(6)}${resetColor} ${originalUrl} ${dimColor}${ip}${resetColor} ${dimColor}${timestamp}${resetColor}`,
  );

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const statusColor = getStatusColor(statusCode);
    const timeColor =
      duration < 100 ? '\x1b[32m' : duration < 500 ? orangeColor : '\x1b[31m';
    const responseTimestamp = formatTimestamp();
    const responseLogLevel = cyanColor + 'LOG RESPONSE' + resetColor;

    const timingPrefix = duration >= 100 ? '+' : '';
    const timingDisplay = `${timeColor}${timingPrefix}${duration}ms${resetColor}`;

    console.log(
      `${dimColor}[${responseLogLevel}]${resetColor} ${dimColor}${responseTimestamp}${resetColor} ${statusColor}${statusCode}${resetColor} ${methodColor}${method.padEnd(6)}${resetColor} ${originalUrl} ${timingDisplay} ${dimColor}${responseTimestamp}${resetColor}`,
    );
  });

  next();
};
