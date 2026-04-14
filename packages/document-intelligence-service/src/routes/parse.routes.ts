import { Router } from 'express';
import multer from 'multer';
import { parseDocument } from '../core/document-intelligence/services/parseDocument.js';
import { cleanupFile } from '../utils/cleanup.js';
import { createMulterLimits, fileFilter, validateUploadedFile } from '../utils/fileValidation.js';
import { resolveStagedPath } from '../utils/tempFiles.js';

const parseRouter = Router();
const upload = multer({
  dest: resolveStagedPath(''),
  limits: createMulterLimits(),
  fileFilter,
});

parseRouter.post('/parse', upload.single('file'), async (req, res, next) => {
  try {
    validateUploadedFile(req.file);
    const result = await parseDocument({
      filePath: req.file.path,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
    });
    res.json(result);
  } catch (error) {
    next(error);
  } finally {
    await cleanupFile(req.file?.path);
  }
});

export { parseRouter };
