import { Router } from 'express';
import multer from 'multer';
import { parseDocument } from '../core/document-intelligence/services/parseDocument.js';
import { extractSigninSheet, extractBusinessCard } from '../core/document-intelligence/dynamicExtractor.js';
import { cleanupFile } from '../utils/cleanup.js';
import {
  createMulterLimits,
  fileFilter,
  validateUploadedFile,
  validateUploadedFileContent,
} from '../utils/fileValidation.js';
import { stageUploadedBuffer } from '../utils/tempFiles.js';
import { normalizeContacts } from '../utils/contactUtils.js';

const specializedRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: createMulterLimits(),
  fileFilter,
});

specializedRouter.post('/process/signin-sheet', upload.single('file'), async (req, res, next) => {
  let stagedFilePath: string | undefined;
  try {
    validateUploadedFile(req.file);
    validateUploadedFileContent(req.file.buffer, req.file.mimetype);
    stagedFilePath = await stageUploadedBuffer(req.file.buffer, req.file.mimetype);

    const parseResult = await parseDocument(
      { filePath: stagedFilePath, fileName: req.file.originalname, mimeType: req.file.mimetype },
    );
    const result = extractSigninSheet(parseResult);

    // Normalize contact fields in each row
    const normalizedRows = normalizeContacts(
      result.normalizedRows.map((row) => ({ ...row })),
    );

    // Re-attach extraFields (normalizeContacts strips unknown keys)
    for (let i = 0; i < normalizedRows.length; i++) {
      (normalizedRows[i] as Record<string, unknown>).extraFields =
        result.normalizedRows[i].extraFields;
    }

    res.json({
      status: result.status,
      structure: result.structure,
      detectedHeaders: result.detectedHeaders,
      headerMapping: result.headerMapping,
      rows: normalizedRows,
      rawRows: result.rawRows,
      confidence: result.confidence,
    });
  } catch (error) {
    next(error);
  } finally {
    await cleanupFile(stagedFilePath);
  }
});

specializedRouter.post('/process/business-card', upload.single('file'), async (req, res, next) => {
  let stagedFilePath: string | undefined;
  try {
    validateUploadedFile(req.file);
    validateUploadedFileContent(req.file.buffer, req.file.mimetype);
    stagedFilePath = await stageUploadedBuffer(req.file.buffer, req.file.mimetype);

    const parseResult = await parseDocument(
      { filePath: stagedFilePath, fileName: req.file.originalname, mimeType: req.file.mimetype },
    );
    const result = extractBusinessCard(parseResult);

    // Normalize known contact fields
    const normalized = normalizeContacts([{ ...result.card }]);
    const card = {
      ...normalized[0],
      extraFields: result.card.extraFields,
      rawText: result.card.rawText,
    };

    res.json({
      status: result.status,
      structure: result.structure,
      detectedHeaders: result.detectedHeaders,
      headerMapping: result.headerMapping,
      card,
      confidence: result.confidence,
    });
  } catch (error) {
    next(error);
  } finally {
    await cleanupFile(stagedFilePath);
  }
});

specializedRouter.post('/process/contact-sheet', upload.single('file'), async (req, res, next) => {
  let stagedFilePath: string | undefined;
  try {
    validateUploadedFile(req.file);
    validateUploadedFileContent(req.file.buffer, req.file.mimetype);
    stagedFilePath = await stageUploadedBuffer(req.file.buffer, req.file.mimetype);

    // Contact sheets use the same structure-first pipeline as sign-in sheets
    const parseResult = await parseDocument(
      { filePath: stagedFilePath, fileName: req.file.originalname, mimeType: req.file.mimetype },
    );
    const result = extractSigninSheet(parseResult);

    const normalizedRows = normalizeContacts(
      result.normalizedRows.map((row) => ({ ...row })),
    );

    for (let i = 0; i < normalizedRows.length; i++) {
      (normalizedRows[i] as Record<string, unknown>).extraFields =
        result.normalizedRows[i].extraFields;
    }

    res.json({
      status: result.status,
      structure: result.structure,
      detectedHeaders: result.detectedHeaders,
      headerMapping: result.headerMapping,
      rows: normalizedRows,
      rawRows: result.rawRows,
      confidence: result.confidence,
    });
  } catch (error) {
    next(error);
  } finally {
    await cleanupFile(stagedFilePath);
  }
});

export { specializedRouter };
