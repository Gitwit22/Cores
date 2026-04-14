import { Router } from 'express';
import multer from 'multer';
import { processDocument } from '../core/document-intelligence/services/processDocument.js';
import { cleanupFile } from '../utils/cleanup.js';
import {
  createMulterLimits,
  fileFilter,
  validateUploadedFile,
  validateUploadedFileContent,
} from '../utils/fileValidation.js';
import { stageUploadedBuffer } from '../utils/tempFiles.js';

const processRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
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
  let stagedFilePath: string | undefined;
  try {
    validateUploadedFile(req.file);
    validateUploadedFileContent(req.file.buffer, req.file.mimetype);
    stagedFilePath = await stageUploadedBuffer(req.file.buffer, req.file.mimetype);
    const body = req.body as Record<string, unknown> | undefined;
    const result = await processDocument(
      {
        filePath: stagedFilePath,
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
    await cleanupFile(stagedFilePath);
  }
});

export { processRouter };
