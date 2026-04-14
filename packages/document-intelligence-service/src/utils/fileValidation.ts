import type { Request } from 'express';
import type { FileFilterCallback } from 'multer';
import { getDocumentIntelligenceConfig } from '../core/document-intelligence/config.js';
import { DocumentIntelligenceInvalidInputError } from '../core/document-intelligence/errors.js';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/tiff',
  'image/bmp',
  'image/webp',
  'text/plain',
  'text/markdown',
]);

export function createMulterLimits(): { fileSize: number } {
  const config = getDocumentIntelligenceConfig();
  return { fileSize: config.maxUploadBytes };
}

export function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback,
): void {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    callback(
      new DocumentIntelligenceInvalidInputError(
        `Unsupported file type "${file.mimetype}".`,
      ),
    );
    return;
  }
  callback(null, true);
}

export function validateUploadedFile(file?: Express.Multer.File): asserts file is Express.Multer.File {
  if (!file) {
    throw new DocumentIntelligenceInvalidInputError('A file upload is required.');
  }

  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new DocumentIntelligenceInvalidInputError(`Unsupported file type "${file.mimetype}".`);
  }
}
