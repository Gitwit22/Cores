import { Router } from 'express';
import multer from 'multer';
import { classifyDocument } from '../core/document-intelligence/services/classifyDocument.js';
import { cleanupFile } from '../utils/cleanup.js';
import {
  createMulterLimits,
  fileFilter,
  validateUploadedFile,
  validateUploadedFileContent,
} from '../utils/fileValidation.js';
import { stageUploadedBuffer } from '../utils/tempFiles.js';

const classifyRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
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
  let stagedFilePath: string | undefined;
  try {
    validateUploadedFile(req.file);
    validateUploadedFileContent(req.file.buffer, req.file.mimetype);
    stagedFilePath = await stageUploadedBuffer(req.file.buffer, req.file.mimetype);
    const body = req.body as Record<string, unknown> | undefined;
    const categories = parseCategories(body?.categories);
    const result = await classifyDocument(
      {
        filePath: stagedFilePath,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
      },
      { categories },
    );
    res.json(result);
  } catch (error) {
    next(error);
  } finally {
    await cleanupFile(stagedFilePath);
  }
});

export { classifyRouter };
