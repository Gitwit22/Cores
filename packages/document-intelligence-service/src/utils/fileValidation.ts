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

const MAGIC_NUMBERS: Record<string, readonly number[]> = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/jpg': [0xff, 0xd8, 0xff],
  'image/tiff': [0x49, 0x49, 0x2a, 0x00],
  'image/bmp': [0x42, 0x4d],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
};

function startsWithBytes(buffer: Uint8Array, expected: readonly number[]): boolean {
  if (buffer.length < expected.length) {
    return false;
  }
  return expected.every((value, index) => buffer[index] === value);
}

export function validateUploadedFileContent(
  fileBuffer: Buffer,
  mimeType: string,
): void {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new DocumentIntelligenceInvalidInputError(`Unsupported file type "${mimeType}".`);
  }

  const signature = MAGIC_NUMBERS[mimeType];
  if (!signature) {
    return;
  }
  const sample = fileBuffer.subarray(0, 16);

  if (mimeType === 'image/webp') {
    if (
      sample.length < 12
      || !startsWithBytes(sample, signature)
      || sample.toString('ascii', 8, 12) !== 'WEBP'
    ) {
      throw new DocumentIntelligenceInvalidInputError(
        `File signature does not match MIME type "${mimeType}".`,
      );
    }
    return;
  }

  if (!startsWithBytes(sample, signature)) {
    throw new DocumentIntelligenceInvalidInputError(
      `File signature does not match MIME type "${mimeType}".`,
    );
  }
}
