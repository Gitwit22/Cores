/**
 * document-intelligence-core/normalizers/classifyNormalizer.ts
 *
 * Maps internal classification scoring output to NormalizedClassificationResult.
 */

import type { NormalizedClassificationResult } from '../types.js';

// ---------------------------------------------------------------------------
// Input shape (internal)
// ---------------------------------------------------------------------------

interface RawClassificationInput {
  documentType: string | null;
  confidence: number | null;
  reasoning: string | null;
  labels?: string[];
  rawResult?: unknown;
  status: 'complete' | 'failed' | 'skipped';
}

// ---------------------------------------------------------------------------
// Normalizer
// ---------------------------------------------------------------------------

/**
 * Map raw classification scoring output to NormalizedClassificationResult.
 */
export function normalizeClassificationResult(
  raw: RawClassificationInput,
): NormalizedClassificationResult {
  return {
    provider: 'llama-cloud',
    status: raw.status,
    documentType: raw.documentType,
    confidence: raw.confidence !== null ? Math.min(Math.max(raw.confidence, 0), 1) : null,
    reasoning: raw.reasoning,
    labels: raw.labels,
    rawResult: raw.rawResult,
  };
}
