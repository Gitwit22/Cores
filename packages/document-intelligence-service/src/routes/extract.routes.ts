import { Router } from 'express';
import multer from 'multer';
import { extractDocument } from '../core/document-intelligence/services/extractDocument.js';
import { cleanupFile } from '../utils/cleanup.js';
import {
  createMulterLimits,
  fileFilter,
  validateUploadedFile,
  validateUploadedFileContent,
} from '../utils/fileValidation.js';
import { DocumentIntelligenceInvalidInputError } from '../core/document-intelligence/errors.js';
import { stageUploadedBuffer } from '../utils/tempFiles.js';

const extractRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: createMulterLimits(),
  fileFilter,
});

function parseSchema(input: unknown): unknown {
  if (!input) {
    throw new DocumentIntelligenceInvalidInputError('`schema` is required for /extract.');
  }
  if (typeof input === 'string') {
    try {
      return JSON.parse(input) as unknown;
    } catch {
      throw new DocumentIntelligenceInvalidInputError('`schema` must be valid JSON.');
    }
  }
  return input;
}

extractRouter.post('/extract', upload.single('file'), async (req, res, next) => {
  let stagedFilePath: string | undefined;
  try {
    validateUploadedFile(req.file);
    validateUploadedFileContent(req.file.buffer, req.file.mimetype);
    stagedFilePath = await stageUploadedBuffer(req.file.buffer, req.file.mimetype);
    const body = req.body as Record<string, unknown> | undefined;
    const schema = parseSchema(body?.schema);
    const result = await extractDocument(
      {
        filePath: stagedFilePath,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
      },
      schema,
    );
    res.json(result);
  } catch (error) {
    next(error);
  } finally {
    await cleanupFile(stagedFilePath);
  }
});

export { extractRouter };
