/**
 * document-intelligence-core/normalizers/indexNormalizer.ts
 *
 * Maps raw index operation output to NormalizedIndexResult.
 */

import type { NormalizedIndexResult } from '../types.js';

// ---------------------------------------------------------------------------
// Input shape (internal)
// ---------------------------------------------------------------------------

interface RawIndexInput {
  indexId?: string | null;
  chunksIndexed?: number | null;
  rawResult?: unknown;
  status?: 'complete' | 'failed' | 'skipped';
}

// ---------------------------------------------------------------------------
// Normalizer
// ---------------------------------------------------------------------------

/**
 * Map raw index operation output to NormalizedIndexResult.
 */
export function normalizeIndexResult(raw: RawIndexInput): NormalizedIndexResult {
  return {
    provider: 'llama-cloud',
    status: raw.status ?? 'complete',
    indexId: raw.indexId ?? null,
    chunksIndexed: raw.chunksIndexed ?? null,
    rawResult: raw.rawResult,
  };
}
