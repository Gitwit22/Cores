import { Router } from 'express';
import multer from 'multer';
import { extractDocument } from '../core/document-intelligence/services/extractDocument.js';
import { cleanupFile } from '../utils/cleanup.js';
import {
  createMulterLimits,
  fileFilter,
  validateUploadedFile,
} from '../utils/fileValidation.js';
import { DocumentIntelligenceInvalidInputError } from '../core/document-intelligence/errors.js';
import { resolveStagedPath } from '../utils/tempFiles.js';

const extractRouter = Router();
const upload = multer({
  dest: resolveStagedPath(''),
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
  try {
    validateUploadedFile(req.file);
    const schema = parseSchema(req.body?.schema);
    const result = await extractDocument(
      {
        filePath: req.file.path,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
      },
      schema,
    );
    res.json(result);
  } catch (error) {
    next(error);
  } finally {
    await cleanupFile(req.file?.path);
  }
});

export { extractRouter };
