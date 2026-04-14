/**
 * document-intelligence-core/normalizers/extractNormalizer.ts
 *
 * Maps raw extraction output to NormalizedExtractionResult.
 */

import type { NormalizedExtractionResult, ExtractedFieldValue } from '../types.js';

// ---------------------------------------------------------------------------
// Input shape (internal)
// ---------------------------------------------------------------------------

interface RawExtractionInput {
  schemaName?: string | null;
  fields: ExtractedFieldValue[];
  confidence: number | null;
  rawResult?: unknown;
  status: 'complete' | 'failed' | 'skipped';
}

// ---------------------------------------------------------------------------
// Normalizer
// ---------------------------------------------------------------------------

/**
 * Map raw extraction output to NormalizedExtractionResult.
 */
export function normalizeExtractionResult(
  raw: RawExtractionInput,
): NormalizedExtractionResult {
  return {
    provider: 'llama-cloud',
    status: raw.status,
    schemaName: raw.schemaName ?? null,
    fields: raw.fields,
    confidence: raw.confidence !== null ? Math.min(Math.max(raw.confidence, 0), 1) : null,
    rawResult: raw.rawResult,
  };
}
