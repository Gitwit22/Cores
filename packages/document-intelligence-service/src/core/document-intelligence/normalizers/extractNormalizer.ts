import type {
  ExtractedFieldValue,
  NormalizedExtractionResult,
} from '../types.js';

interface ExtractionInput {
  fields: ExtractedFieldValue[];
  confidence: number | null;
  status: 'complete' | 'failed' | 'skipped';
}

export function normalizeExtractionResult(input: ExtractionInput): NormalizedExtractionResult {
  return {
    provider: 'llama-cloud',
    status: input.status,
    fields: input.fields,
    confidence: input.confidence === null ? null : Math.min(Math.max(input.confidence, 0), 1),
  };
}
