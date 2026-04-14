import { Router } from 'express';
import multer from 'multer';
import { processDocument } from '../core/document-intelligence/services/processDocument.js';
import { cleanupFile } from '../utils/cleanup.js';
import {
  createMulterLimits,
  fileFilter,
  validateUploadedFile,
} from '../utils/fileValidation.js';
import { resolveStagedPath } from '../utils/tempFiles.js';

const processRouter = Router();
const upload = multer({
  dest: resolveStagedPath(''),
  limits: createMulterLimits(),
  fileFilter,
});

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') {
      return true;
    }
    if (value.toLowerCase() === 'false') {
      return false;
    }
  }
  return fallback;
}

function parseSchema(input: unknown): unknown {
  if (!input) {
    return undefined;
  }
  if (typeof input === 'string') {
    try {
      return JSON.parse(input) as unknown;
    } catch {
      return undefined;
    }
  }
  return input;
}

function parseCategories(input: unknown): string[] | undefined {
  if (!input) {
    return undefined;
  }
  if (Array.isArray(input)) {
    return input.filter((value): value is string => typeof value === 'string');
  }
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((value): value is string => typeof value === 'string');
      }
    } catch {
      return input
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value !== '');
    }
  }
  return undefined;
}

processRouter.post('/process', upload.single('file'), async (req, res, next) => {
  try {
    validateUploadedFile(req.file);
    const body = req.body as Record<string, unknown> | undefined;
    const result = await processDocument(
      {
        filePath: req.file.path,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
      },
      {
        parse: asBoolean(body?.parse, true),
        classify: asBoolean(body?.classify, false),
        extract: asBoolean(body?.extract, false),
        schema: parseSchema(body?.schema),
        categories: parseCategories(body?.categories),
      },
    );
    res.json(result);
  } catch (error) {
    next(error);
  } finally {
    await cleanupFile(req.file?.path);
  }
});

export { processRouter };
