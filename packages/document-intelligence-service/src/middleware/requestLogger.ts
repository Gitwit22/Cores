import type { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    const elapsedMs = Date.now() - start;
    console.info(
      `[doc-intel-service] ${req.method} ${req.originalUrl} ${res.statusCode} ${elapsedMs}ms`,
    );
  });
  next();
}
