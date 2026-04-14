import type { NormalizedClassificationResult } from '../types.js';

interface ClassificationInput {
  documentType: string | null;
  confidence: number | null;
  reasoning: string | null;
  labels?: string[];
  status: 'complete' | 'failed' | 'skipped';
}

export function normalizeClassificationResult(
  input: ClassificationInput,
): NormalizedClassificationResult {
  return {
    provider: 'llama-cloud',
    status: input.status,
    documentType: input.documentType,
    confidence: input.confidence === null ? null : Math.min(Math.max(input.confidence, 0), 1),
    reasoning: input.reasoning,
    labels: input.labels,
  };
}
