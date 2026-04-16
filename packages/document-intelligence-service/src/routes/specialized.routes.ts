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
import { stageUploadedBuffer } from '../utils/tempFiles.js';
import { normalizeContacts } from '../utils/contactUtils.js';

const specializedRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: createMulterLimits(),
  fileFilter,
});

const SIGNIN_SCHEMA = {
  fields: [
    { key: 'fullName', description: 'Full name of the person' },
    { key: 'phone', description: 'Phone number' },
    { key: 'email', description: 'Email address' },
    { key: 'date', description: 'Date signed up or attended' },
    { key: 'comments', description: 'Any comments or notes' },
  ],
};

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

specializedRouter.post('/process/signin-sheet', upload.single('file'), async (req, res, next) => {
  let stagedFilePath: string | undefined;
  try {
    validateUploadedFile(req.file);
    validateUploadedFileContent(req.file.buffer, req.file.mimetype);
    stagedFilePath = await stageUploadedBuffer(req.file.buffer, req.file.mimetype);
    const result = await extractDocument(
      { filePath: stagedFilePath, fileName: req.file.originalname, mimeType: req.file.mimetype },
      SIGNIN_SCHEMA,
    );
    const fieldMap = Object.fromEntries(result.fields.map((f) => [f.key, f.value ?? '']));
    const row = {
      id: crypto.randomUUID(),
      fullName: fieldMap['fullName'] ?? '',
      phone: fieldMap['phone'] ?? '',
      email: fieldMap['email'] ?? '',
      date: fieldMap['date'] ?? '',
      comments: fieldMap['comments'] ?? '',
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

specializedRouter.post('/process/business-card', upload.single('file'), async (req, res, next) => {
  let stagedFilePath: string | undefined;
  try {
    validateUploadedFile(req.file);
    validateUploadedFileContent(req.file.buffer, req.file.mimetype);
    stagedFilePath = await stageUploadedBuffer(req.file.buffer, req.file.mimetype);
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
    res.json({ status: result.status, card, confidence: result.confidence });
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
