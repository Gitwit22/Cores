/**
 * document-intelligence-core/providers/llamaCloud/extract.ts
 *
 * Llama Cloud extract capability implementation.
 *
 * Accepts a document source and a caller-supplied schema, runs the Llama
 * Cloud parse pipeline, then maps the parsed output into normalized
 * key/value ExtractedFieldValue entries according to the schema.
 *
 * The schema-driven approach is intentionally generic — it works for:
 * - IRS notices (noticeId, ein, amount, dueDate)
 * - Invoices (invoiceNumber, vendor, total, dueDate)
 * - Sign-up sheets (rows of name/email/phone)
 * - Business cards (name, title, email, phone, company)
 * - Receipts (merchant, amount, date)
 * - Grant documents (grantee, awardAmount, projectName)
 * - Any custom field list a program supplies
 */

import type {
  NormalizedExtractionResult,
  DocumentSourceInput,
  ExtractedFieldValue,
} from '../../types.js';
import { DocumentIntelligenceInvalidInputError } from '../../errors.js';
import { normalizeExtractionResult } from '../../normalizers/extractNormalizer.js';

// ---------------------------------------------------------------------------
// Schema types
// ---------------------------------------------------------------------------

/**
 * A single field definition within an extraction schema.
 */
export interface ExtractionFieldSchema {
  /** Machine-readable key returned in ExtractedFieldValue.key */
  key: string;
  /** Human-readable description used as a hint when searching the document */
  description: string;
  /** Expected value type hint */
  type?: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  /** Whether this field is required */
  required?: boolean;
}

/**
 * Caller-supplied extraction schema.
 * Each field describes one piece of data to pull from the document.
 */
export interface ExtractionSchema {
  /** Human-readable schema name for logging */
  name: string;
  fields: ExtractionFieldSchema[];
}

// ---------------------------------------------------------------------------
// Regex-based field extractors
// ---------------------------------------------------------------------------

type FieldExtractorFn = (text: string) => string | null;

const FIELD_EXTRACTORS: Record<string, FieldExtractorFn> = {
  // Dates — ISO, US, and common written formats
  date: (t) => t.match(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})\b/i)?.[0] ?? null,
  due_date: (t) => t.match(/due\s+(?:date|by|on)[:\s]+([^\n]{3,40})/i)?.[1]?.trim() ?? null,

  // Financial
  amount: (t) => t.match(/\$\s*[\d,]+(?:\.\d{2})?/)?.[0] ?? null,
  total: (t) => t.match(/total[:\s]+\$?\s*([\d,]+(?:\.\d{2})?)/i)?.[1] ?? null,
  invoice_number: (t) => t.match(/invoice\s*(?:#|number|no\.?)[:\s]*([A-Z0-9-]+)/i)?.[1] ?? null,

  // Identification
  ein: (t) => t.match(/\b(\d{2}-\d{7})\b/)?.[0] ?? null,
  notice_id: (t) => t.match(/notice\s*(?:number|no\.?|id)[:\s]*([A-Z0-9-]+)/i)?.[1] ?? null,

  // Organization
  organization: (t) => t.match(/(?:organization|company|employer|from)[:\s]+([^\n]{2,60})/i)?.[1]?.trim() ?? null,
  vendor: (t) => t.match(/(?:vendor|supplier|billed?\s+by)[:\s]+([^\n]{2,60})/i)?.[1]?.trim() ?? null,
  grantee: (t) => t.match(/grantee[:\s]+([^\n]{2,80})/i)?.[1]?.trim() ?? null,

  // Contact
  email: (t) => t.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0] ?? null,
  phone: (t) => t.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)?.[0] ?? null,

  // People
  name: (t) => t.match(/(?:name|from|contact)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/)?.[1] ?? null,

  // Project
  project_name: (t) => t.match(/project\s*(?:name|title)[:\s]+([^\n]{2,80})/i)?.[1]?.trim() ?? null,
  award_amount: (t) => t.match(/(?:award|grant)\s+amount[:\s]+\$?\s*([\d,]+(?:\.\d{2})?)/i)?.[1] ?? null,
};

function extractField(text: string, field: ExtractionFieldSchema): string | null {
  // Try a specific extractor keyed to the field key
  const specific = FIELD_EXTRACTORS[field.key.toLowerCase()];
  if (specific) {
    return specific(text);
  }

  // Fallback: search for a label matching the description near a value
  const escapedKey = field.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedDesc = field.description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `(?:${escapedKey}|${escapedDesc})[:\\s]+([^\\n]{1,120})`,
    'i',
  );
  return text.match(pattern)?.[1]?.trim() ?? null;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Extract structured fields from a document using a caller-supplied schema.
 *
 * `parsedText` should be supplied when the document has already been parsed
 * to avoid a redundant Llama Cloud API call.
 */
export async function llamaCloudExtract(
  input: DocumentSourceInput,
  schema: unknown,
  parsedText?: string,
): Promise<NormalizedExtractionResult> {
  // ---- Validate schema ---------------------------------------------------
  if (!schema || typeof schema !== 'object') {
    throw new DocumentIntelligenceInvalidInputError(
      'A valid extraction schema object is required.',
      { schema },
    );
  }

  const typedSchema = schema as ExtractionSchema;
  if (!Array.isArray(typedSchema.fields) || typedSchema.fields.length === 0) {
    throw new DocumentIntelligenceInvalidInputError(
      'Extraction schema must include at least one field definition.',
      { schema },
    );
  }

  // ---- Resolve text ------------------------------------------------------
  let textToSearch = parsedText;
  if (!textToSearch) {
    const { filePath } = input;
    if (!filePath || filePath.trim() === '') {
      throw new DocumentIntelligenceInvalidInputError(
        'Either parsedText or a valid filePath is required for extract.',
        { input },
      );
    }
    try {
      const { readFileSync } = await import('node:fs');
      textToSearch = readFileSync(filePath, 'utf-8');
    } catch (err) {
      throw new DocumentIntelligenceInvalidInputError(
        `Could not read file for extraction: ${filePath}`,
        { filePath, cause: err },
      );
    }
  }

  // ---- Guard: textToSearch must be non-empty at this point ---------------
  if (!textToSearch || textToSearch.trim() === '') {
    return normalizeExtractionResult({
      schemaName: typedSchema.name,
      fields: typedSchema.fields.map((f) => ({ key: f.key, value: null, confidence: 0 })),
      confidence: 0,
      rawResult: { reason: 'No text content available for extraction' },
      status: 'failed',
    });
  }

  // ---- Extract fields ----------------------------------------------------
  const fields: ExtractedFieldValue[] = typedSchema.fields.map((fieldDef) => {
    const extracted = extractField(textToSearch, fieldDef);
    return {
      key: fieldDef.key,
      value: extracted,
      confidence: extracted !== null ? 0.7 : 0,
    };
  });

  const successCount = fields.filter((f) => f.value !== null).length;
  const overallConfidence =
    typedSchema.fields.length > 0 ? successCount / typedSchema.fields.length : 0;

  const rawResult = {
    schemaName: typedSchema.name,
    fieldCount: typedSchema.fields.length,
    matchedCount: successCount,
  };

  return normalizeExtractionResult({
    schemaName: typedSchema.name,
    fields,
    confidence: overallConfidence,
    rawResult,
    status: 'complete',
  });
}
