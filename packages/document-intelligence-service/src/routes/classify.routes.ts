import { Router } from 'express';
import multer from 'multer';
import { classifyDocument } from '../core/document-intelligence/services/classifyDocument.js';
import { cleanupFile } from '../utils/cleanup.js';
import {
  createMulterLimits,
  fileFilter,
  validateUploadedFile,
} from '../utils/fileValidation.js';
import { resolveStagedPath } from '../utils/tempFiles.js';

const classifyRouter = Router();
const upload = multer({
  dest: resolveStagedPath(''),
  limits: createMulterLimits(),
  fileFilter,
});

function parseCategories(input: unknown): string[] | undefined {
  if (Array.isArray(input)) {
    return input.filter((value): value is string => typeof value === 'string');
  }
  if (typeof input === 'string' && input.trim() !== '') {
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

classifyRouter.post('/classify', upload.single('file'), async (req, res, next) => {
  try {
    validateUploadedFile(req.file);
    const body = req.body as Record<string, unknown> | undefined;
    const categories = parseCategories(body?.categories);
    const result = await classifyDocument(
      {
        filePath: req.file.path,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
      },
      { categories },
    );
    res.json(result);
  } catch (error) {
    next(error);
  } finally {
    await cleanupFile(req.file?.path);
  }
});

export { classifyRouter };
