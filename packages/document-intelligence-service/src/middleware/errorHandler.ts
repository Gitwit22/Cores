import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { DocumentIntelligenceError } from '../core/document-intelligence/errors.js';

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof multer.MulterError) {
    res.status(400).json({
      error: {
        code: 'UPLOAD_ERROR',
        message: error.message,
      },
    });
    return;
  }

  if (error instanceof DocumentIntelligenceError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  console.error('[doc-intel-service] unhandled error', error);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unexpected server error.',
    },
  });
}
