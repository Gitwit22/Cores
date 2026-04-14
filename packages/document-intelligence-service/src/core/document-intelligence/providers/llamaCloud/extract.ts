import type {
  DocumentSourceInput,
  ExtractedFieldValue,
  NormalizedExtractionResult,
} from '../../types.js';
import { DocumentIntelligenceInvalidInputError } from '../../errors.js';
import { normalizeExtractionResult } from '../../normalizers/extractNormalizer.js';
import { llamaCloudParse } from './parse.js';

interface ExtractionFieldSchema {
  key: string;
  description?: string;
}

interface ExtractionSchema {
  fields: ExtractionFieldSchema[];
}

const FIELD_PATTERNS: Record<string, RegExp> = {
  date: /\b(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})\b/i,
  amount: /\$\s*[\d,]+(?:\.\d{2})?/i,
  invoice_number: /invoice\s*(?:#|number|no\.?)[:\s]*([A-Z0-9-]+)/i,
  email: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
  phone: /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
};

function extractByField(text: string, field: ExtractionFieldSchema): unknown {
  const pattern = FIELD_PATTERNS[field.key.toLowerCase()];
  if (pattern) {
    const match = text.match(pattern);
    if (!match) {
      return null;
    }
    return match[1] ?? match[0] ?? null;
  }

  const descriptor = field.description?.trim() ?? field.key;
  const escaped = descriptor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const genericPattern = new RegExp(`${escaped}[:\\s]+([^\\n]{1,120})`, 'i');
  const genericMatch = text.match(genericPattern);
  return genericMatch?.[1]?.trim() ?? null;
}

export async function llamaCloudExtract(
  input: DocumentSourceInput,
  schema: unknown,
): Promise<NormalizedExtractionResult> {
  const typedSchema = schema as ExtractionSchema;
  if (!typedSchema || !Array.isArray(typedSchema.fields) || typedSchema.fields.length === 0) {
    throw new DocumentIntelligenceInvalidInputError(
      'A schema with at least one field is required for extraction.',
    );
  }

  const parseResult = await llamaCloudParse(input);
  if (parseResult.status !== 'complete') {
    return normalizeExtractionResult({
      status: 'failed',
      fields: typedSchema.fields.map((field) => ({ key: field.key, value: null, confidence: 0 })),
      confidence: 0,
    });
  }

  const fields: ExtractedFieldValue[] = typedSchema.fields.map((field) => {
    const value = extractByField(parseResult.text, field);
    return {
      key: field.key,
      value,
      confidence: value === null ? 0 : 0.7,
    };
  });

  const matchedCount = fields.filter((field) => field.value !== null).length;
  const confidence = typedSchema.fields.length > 0
    ? matchedCount / typedSchema.fields.length
    : 0;

  return normalizeExtractionResult({
    status: 'complete',
    fields,
    confidence,
  });
}
