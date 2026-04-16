import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      traceId: string;
    }
  }
}

export const traceId: RequestHandler = (req, res, next) => {
  const incoming = req.header('x-trace-id');
  const id = incoming && incoming.length <= 128 ? incoming : randomUUID();
  req.traceId = id;
  res.setHeader('x-trace-id', id);
  next();
};
