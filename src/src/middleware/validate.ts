import type { RequestHandler } from 'express';
import type { ZodSchema } from 'zod';

export function validateBody<T>(schema: ZodSchema<T>): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'invalid_body',
        issues: result.error.issues,
        trace_id: req.traceId,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({
        error: 'invalid_query',
        issues: result.error.issues,
        trace_id: req.traceId,
      });
      return;
    }
    (req as unknown as { validatedQuery: T }).validatedQuery = result.data;
    next();
  };
}
