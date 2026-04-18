import { Router } from 'express';
import multer from 'multer';
import { extractDocument } from '../core/document-intelligence/services/extractDocument.js';
import { parseDocument } from '../core/document-intelligence/services/parseDocument.js';
import { cleanupFile } from '../utils/cleanup.js';
import {
  createMulterLimits,
  fileFilter,
  validateUploadedFile,
  validateUploadedFileContent,
} from '../utils/fileValidation.js';
import { stageUploadedBuffer } from '../utils/tempFiles.js';
import { normalizeContacts } from '../utils/contactUtils.js';
import {
  extractSigninRowsFromMarkdown,
  extractSigninFromText,
  extractBusinessCardFromMarkdown,
} from '../utils/tableExtractor.js';

const specializedRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: createMulterLimits(),
  fileFilter,
});

const BUSINESS_CARD_SCHEMA = {
  fields: [
    { key: 'firstName', description: 'First name' },
    { key: 'lastName', description: 'Last name' },
    { key: 'company', description: 'Company or organization name' },
    { key: 'title', description: 'Job title or role' },
    { key: 'phone', description: 'Phone number' },
    { key: 'email', description: 'Email address' },
    { key: 'website', description: 'Website URL' },
    { key: 'address', description: 'Mailing or street address' },
  ],
};

const CONTACT_SHEET_SCHEMA = {
  fields: [
    { key: 'name', description: 'Full name or contact name' },
    { key: 'phone', description: 'Phone number' },
    { key: 'email', description: 'Email address' },
    { key: 'organization', description: 'Organization or company' },
    { key: 'notes', description: 'Any notes or additional info' },
  ],
};

specializedRouter.post('/process/signin-sheet', upload.single('file'), async (req, res, next): Promise<void> => {
  let stagedFilePath: string | undefined;
  try {
    validateUploadedFile(req.file);
    validateUploadedFileContent(req.file.buffer, req.file.mimetype);
    stagedFilePath = await stageUploadedBuffer(req.file.buffer, req.file.mimetype);

    const includeDebug = (req.query['debug'] === 'true') || (req.body?.debug === true);

    // Step 1: Parse — LlamaParse preserves table structure as markdown tables.
    const parseResult = await parseDocument(
      { filePath: stagedFilePath, fileName: req.file.originalname, mimeType: req.file.mimetype },
    );

    if (parseResult.status !== 'complete') {
      res.json({ status: 'failed', rows: [], structure: 'unstructured', detectedHeaders: [], headerMapping: {} });
      return;
    }

    // Step 2: Try structured table extraction from the markdown output.
    const tableResult = extractSigninRowsFromMarkdown(parseResult.markdown, includeDebug);

    if (tableResult.structure === 'table' && tableResult.rows.length > 0) {
      const rows = tableResult.rows.map((row) => ({
        id: crypto.randomUUID(),
        fullName: row.fullName,
        organization: row.organization,
        phone: row.phone,
        email: row.email,
        screening: row.screening,
        shareInfo: row.shareInfo,
        date: row.date,
        comments: row.comments,
        ...(includeDebug ? { _debug: row._debug } : {}),
      }));
      const normalized = normalizeContacts(rows);
      res.json({
        status: 'complete',
        rows: normalized,
        structure: tableResult.structure,
        detectedHeaders: tableResult.detectedHeaders,
        headerMapping: tableResult.headerMapping,
      });
      return;
    }

    // Step 3: Fallback — pattern-based extraction from plain text (single record).
    console.warn('[signin-sheet] No table structure detected — falling back to text extraction.');
    const textFields = extractSigninFromText(parseResult.text);
    const fallbackRow = {
      id: crypto.randomUUID(),
      fullName: textFields.fullName ?? '',
      organization: textFields.organization ?? '',
      phone: textFields.phone ?? '',
      email: textFields.email ?? '',
      screening: '',
      shareInfo: '',
      date: textFields.date ?? '',
      comments: '',
    };
    const normalized = normalizeContacts([fallbackRow]);
    res.json({
      status: 'complete',
      rows: normalized,
      structure: 'unstructured',
      detectedHeaders: [],
      headerMapping: {},
    });
    return;
  } catch (error) {
    next(error);
    return;
  } finally {
    await cleanupFile(stagedFilePath);
  }
});

specializedRouter.post('/process/business-card', upload.single('file'), async (req, res, next): Promise<void> => {
  let stagedFilePath: string | undefined;
  try {
    validateUploadedFile(req.file);
    validateUploadedFileContent(req.file.buffer, req.file.mimetype);
    stagedFilePath = await stageUploadedBuffer(req.file.buffer, req.file.mimetype);
    const includeDebug = (req.query['debug'] === 'true') || (req.body?.debug === true);

    const parseResult = await parseDocument(
      { filePath: stagedFilePath, fileName: req.file.originalname, mimeType: req.file.mimetype },
    );

    if (parseResult.status === 'complete') {
      const structured = extractBusinessCardFromMarkdown(parseResult.markdown);
      const card = {
        id: crypto.randomUUID(),
        ...structured.card,
      };

      res.json({
        status: 'complete',
        card,
        structure: structured.structure,
        detectedHeaders: structured.detectedHeaders,
        headerMapping: structured.headerMapping,
        ...(includeDebug
          ? {
            debug: {
              rawLines: parseResult.markdown
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line !== '')
                .slice(0, 60),
            },
          }
          : {}),
      });
      return;
    }

    // Fallback to existing schema-driven extraction if parsing fails.
    const result = await extractDocument(
      { filePath: stagedFilePath, fileName: req.file.originalname, mimeType: req.file.mimetype },
      BUSINESS_CARD_SCHEMA,
    );
    const fieldMap = Object.fromEntries(result.fields.map((f) => [f.key, f.value ?? '']));
    const card = {
      id: crypto.randomUUID(),
      firstName: fieldMap['firstName'] ?? '',
      lastName: fieldMap['lastName'] ?? '',
      company: fieldMap['company'] ?? '',
      title: fieldMap['title'] ?? '',
      phone: fieldMap['phone'] ?? '',
      email: fieldMap['email'] ?? '',
      website: fieldMap['website'] ?? '',
      address: fieldMap['address'] ?? '',
      _confidence: result.confidence,
    };
    res.json({ status: result.status, card, confidence: result.confidence, structure: 'text', detectedHeaders: [], headerMapping: {} });
    return;
  } catch (error) {
    next(error);
    return;
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
    const result = await extractDocument(
      { filePath: stagedFilePath, fileName: req.file.originalname, mimeType: req.file.mimetype },
      CONTACT_SHEET_SCHEMA,
    );
    const fieldMap = Object.fromEntries(result.fields.map((f) => [f.key, f.value ?? '']));
    const row = {
      id: crypto.randomUUID(),
      name: fieldMap['name'] ?? '',
      phone: fieldMap['phone'] ?? '',
      email: fieldMap['email'] ?? '',
      organization: fieldMap['organization'] ?? '',
      notes: fieldMap['notes'] ?? '',
      _confidence: result.confidence,
    };
    const normalized = normalizeContacts([row]);
    res.json({ status: result.status, rows: normalized, confidence: result.confidence });
  } catch (error) {
    next(error);
  } finally {
    await cleanupFile(stagedFilePath);
  }
});

export { specializedRouter };
