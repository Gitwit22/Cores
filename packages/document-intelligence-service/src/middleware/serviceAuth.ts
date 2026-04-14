import type { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'node:crypto';

export function serviceAuth(req: Request, res: Response, next: NextFunction): void {
  const expectedToken = process.env.SERVICE_API_KEY?.trim();

  if (!expectedToken) {
    res.status(503).json({
      error: {
        code: 'SERVICE_AUTH_NOT_CONFIGURED',
        message: 'SERVICE_API_KEY is not configured.',
      },
    });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid Authorization header.',
      },
    });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const provided = Buffer.from(token);
  const expected = Buffer.from(expectedToken);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Invalid service token.',
      },
    });
    return;
  }

  next();
}
