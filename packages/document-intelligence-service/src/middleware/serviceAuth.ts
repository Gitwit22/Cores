import type { Request, Response, NextFunction } from 'express';

export function serviceAuth(req: Request, res: Response, next: NextFunction): void {
  const expectedToken = process.env.SERVICE_AUTH_TOKEN?.trim();

  if (!expectedToken) {
    res.status(503).json({
      error: {
        code: 'SERVICE_AUTH_NOT_CONFIGURED',
        message: 'SERVICE_AUTH_TOKEN is not configured.',
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
  if (token !== expectedToken) {
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
