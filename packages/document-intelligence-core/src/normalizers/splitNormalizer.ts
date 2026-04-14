/**
 * document-intelligence-core/normalizers/splitNormalizer.ts
 *
 * Maps raw split output to NormalizedSplitResult.
 */

import type { NormalizedSplitResult, DocumentSegment } from '../types.js';

// ---------------------------------------------------------------------------
// Input shape (internal)
// ---------------------------------------------------------------------------

interface RawSplitInput {
  segments: DocumentSegment[];
  rawResult?: unknown;
  status?: 'complete' | 'failed' | 'skipped';
}

// ---------------------------------------------------------------------------
// Normalizer
// ---------------------------------------------------------------------------

/**
 * Map raw split output to NormalizedSplitResult.
 */
export function normalizeSplitResult(raw: RawSplitInput): NormalizedSplitResult {
  return {
    provider: 'llama-cloud',
    status: raw.status ?? 'complete',
    segments: raw.segments,
    rawResult: raw.rawResult,
  };
}
