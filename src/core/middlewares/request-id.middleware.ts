import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Gắn một correlation id cho mỗi request để trace log xuyên suốt.
 * Ưu tiên dùng id do client/gateway gửi lên (header X-Request-Id),
 * nếu không có thì sinh mới bằng UUID v4.
 */
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const incoming = req.headers[REQUEST_ID_HEADER];
  const requestId =
    (Array.isArray(incoming) ? incoming[0] : incoming) || randomUUID();

  req.id = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
};
