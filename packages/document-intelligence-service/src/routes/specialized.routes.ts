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
import type { NormalizedParseResult } from '../core/document-intelligence/types.js';

const specializedRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: createMulterLimits(),
  fileFilter,
});

interface ParseDebugSummary {
  hasPipeTable: boolean;
  markdownPreview: string[];
  textPreview: string[];
  quality?: ExtractionQualitySummary;
}

interface SigninQualitySummary {
  rowCount: number;
  nonEmptyRowCount: number;
  namePopulatedCount: number;
  organizationPopulatedCount: number;
  nameCoverage: number;
  organizationCoverage: number;
  detectedHeadersCount: number;
  mappedHeaderCount: number;
  coreHeadersMapped: string[];
}

interface CardQualitySummary {
  populatedCoreFields: string[];
  missingCoreFields: string[];
  populatedCoreCount: number;
  totalCoreCount: number;
}

interface ExtractionQualitySummary {
  signin?: SigninQualitySummary;
  businessCard?: CardQualitySummary;
}

function previewLines(value: string, maxLines = 25, maxChars = 220): string[] {
  return value
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, maxLines)
    .map((line) => (line.length > maxChars ? `${line.slice(0, maxChars)}...` : line));
}

function hasPipeTable(markdown: string): boolean {
  const lines = markdown.split('\n').map((line) => line.trim());
  for (let i = 0; i < lines.length - 1; i++) {
    if (!/^\|.+\|$/.test(lines[i])) continue;
    if (/^\|[\s:]*-+[\s:]*(\|[\s:]*-+[\s:]*)+\|$/.test(lines[i + 1])) {
      return true;
    }
  }
  return false;
}

function shouldIncludeParseDebug(req: { query: Record<string, unknown> }): boolean {
  const envEnabled = process.env.DOC_INTEL_INCLUDE_PARSE_DEBUG === 'true';
  const queryValue = String(req.query?.debugParse ?? '').toLowerCase();
  const queryEnabled = queryValue === '1' || queryValue === 'true' || queryValue === 'yes';
  return envEnabled || queryEnabled;
}

function buildParseDebugSummary(parseResult: NormalizedParseResult): ParseDebugSummary {
  return {
    hasPipeTable: hasPipeTable(parseResult.markdown ?? ''),
    markdownPreview: previewLines(parseResult.markdown ?? ''),
    textPreview: previewLines(parseResult.text ?? ''),
  };
}

function asCleanString(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function clampRatio(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function buildSigninQualitySummary(
  normalizedRows: Array<Record<string, unknown>>,
  detectedHeaders: string[],
  headerMapping: Array<{ normalized: string | null }>,
): SigninQualitySummary {
  const rowCount = normalizedRows.length;
  const nonEmptyRowCount = normalizedRows.filter((row) => {
    return [row.fullName, row.organization, row.email, row.phone]
      .map((value) => asCleanString(value))
      .some((value) => value.length > 0);
  }).length;

  const namePopulatedCount = normalizedRows.filter(
    (row) => asCleanString(row.fullName).length > 0,
  ).length;
  const organizationPopulatedCount = normalizedRows.filter(
    (row) => asCleanString(row.organization).length > 0,
  ).length;

  const mappedHeaders = headerMapping
    .map((mapping) => mapping.normalized)
    .filter((normalized): normalized is string => typeof normalized === 'string' && normalized.length > 0);

  const coreHeaders = ['fullName', 'organization', 'email', 'phone'];
  const coreHeadersMapped = coreHeaders.filter((field) => mappedHeaders.includes(field));

  return {
    rowCount,
    nonEmptyRowCount,
    namePopulatedCount,
    organizationPopulatedCount,
    nameCoverage: clampRatio(rowCount > 0 ? namePopulatedCount / rowCount : 0),
    organizationCoverage: clampRatio(rowCount > 0 ? organizationPopulatedCount / rowCount : 0),
    detectedHeadersCount: detectedHeaders.length,
    mappedHeaderCount: mappedHeaders.length,
    coreHeadersMapped,
  };
}

function buildCardQualitySummary(card: Record<string, unknown>): CardQualitySummary {
  const coreFields = ['fullName', 'company', 'email', 'phone'];
  const populatedCoreFields = coreFields.filter((field) => asCleanString(card[field]).length > 0);
  const missingCoreFields = coreFields.filter((field) => !populatedCoreFields.includes(field));

  return {
    populatedCoreFields,
    missingCoreFields,
    populatedCoreCount: populatedCoreFields.length,
    totalCoreCount: coreFields.length,
  };
}

specializedRouter.post('/process/signin-sheet', upload.single('file'), async (req, res, next): Promise<void> => {
  let stagedFilePath: string | undefined;
  try {
    validateUploadedFile(req.file);
    validateUploadedFileContent(req.file.buffer, req.file.mimetype);
    stagedFilePath = await stageUploadedBuffer(req.file.buffer, req.file.mimetype);

    const parseResult = await parseDocument(
      { filePath: stagedFilePath, fileName: req.file.originalname, mimeType: req.file.mimetype },
    );
    const result = extractSigninSheet(parseResult);
    const parseDebug = shouldIncludeParseDebug(req) ? buildParseDebugSummary(parseResult) : undefined;

    // Normalize contact fields in each row
    const normalizedRows = normalizeContacts(
      result.normalizedRows.map((row) => ({ ...row })),
    );

    // Re-attach extraFields (normalizeContacts strips unknown keys)
    for (let i = 0; i < normalizedRows.length; i++) {
      (normalizedRows[i] as Record<string, unknown>).extraFields =
        result.normalizedRows[i].extraFields;
    }

    if (parseDebug) {
      parseDebug.quality = {
        signin: buildSigninQualitySummary(
          normalizedRows as Array<Record<string, unknown>>,
          result.detectedHeaders,
          result.headerMapping,
        ),
      };
    }

    res.json({
      status: result.status,
      structure: result.structure,
      detectedHeaders: result.detectedHeaders,
      headerMapping: result.headerMapping,
      rows: normalizedRows,
      rawRows: result.rawRows,
      confidence: result.confidence,
      parseDebug,
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

    const parseResult = await parseDocument(
      { filePath: stagedFilePath, fileName: req.file.originalname, mimeType: req.file.mimetype },
    );
    const result = extractBusinessCard(parseResult);
    const parseDebug = shouldIncludeParseDebug(req) ? buildParseDebugSummary(parseResult) : undefined;

    // Normalize known contact fields
    const normalized = normalizeContacts([{ ...result.card }]);
    const card = {
      ...normalized[0],
      extraFields: result.card.extraFields,
      rawText: result.card.rawText,
    };

    if (parseDebug) {
      parseDebug.quality = {
        businessCard: buildCardQualitySummary(card),
      };
    }

    res.json({
      status: result.status,
      structure: result.structure,
      detectedHeaders: result.detectedHeaders,
      headerMapping: result.headerMapping,
      card,
      confidence: result.confidence,
      parseDebug,
    });
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

    // Contact sheets use the same structure-first pipeline as sign-in sheets
    const parseResult = await parseDocument(
      { filePath: stagedFilePath, fileName: req.file.originalname, mimeType: req.file.mimetype },
    );
    const result = extractSigninSheet(parseResult);
    const parseDebug = shouldIncludeParseDebug(req) ? buildParseDebugSummary(parseResult) : undefined;

    const normalizedRows = normalizeContacts(
      result.normalizedRows.map((row) => ({ ...row })),
    );

    for (let i = 0; i < normalizedRows.length; i++) {
      (normalizedRows[i] as Record<string, unknown>).extraFields =
        result.normalizedRows[i].extraFields;
    }

    if (parseDebug) {
      parseDebug.quality = {
        signin: buildSigninQualitySummary(
          normalizedRows as Array<Record<string, unknown>>,
          result.detectedHeaders,
          result.headerMapping,
        ),
      };
    }

    res.json({
      status: result.status,
      structure: result.structure,
      detectedHeaders: result.detectedHeaders,
      headerMapping: result.headerMapping,
      rows: normalizedRows,
      rawRows: result.rawRows,
      confidence: result.confidence,
      parseDebug,
    });
    return;
  } catch (error) {
    next(error);
    return;
  } finally {
    await cleanupFile(stagedFilePath);
  }
});

export { specializedRouter };
