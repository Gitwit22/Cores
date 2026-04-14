/**
 * document-intelligence-core/providers/llamaCloud/split.ts
 *
 * Llama Cloud split capability — scaffolded.
 *
 * Splits a document into logical segments (paragraphs / sections).
 * The current implementation uses a simple text-based splitter on
 * pre-parsed content. A richer provider-native split API can replace
 * this implementation once Llama Cloud exposes one without any changes
 * to the calling service layer.
 *
 * TODO: Replace with a provider-native segment/split API when available.
 */

import type { NormalizedSplitResult, DocumentSourceInput, DocumentSegment } from '../../types.js';
import { DocumentIntelligenceInvalidInputError } from '../../errors.js';
import { normalizeSplitResult } from '../../normalizers/splitNormalizer.js';

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Split pre-parsed text into logical segments.
 *
 * Callers should parse the document first and supply `parsedText` to avoid
 * an extra API call.
 */
export async function llamaCloudSplit(
  input: DocumentSourceInput,
  parsedText?: string,
): Promise<NormalizedSplitResult> {
  // ---- Resolve text ------------------------------------------------------
  let textToSplit = parsedText;

  if (!textToSplit) {
    const { filePath } = input;
    if (!filePath || filePath.trim() === '') {
      throw new DocumentIntelligenceInvalidInputError(
        'Either parsedText or a valid filePath is required for split.',
        { input },
      );
    }
    try {
      const { readFileSync } = await import('node:fs');
      textToSplit = readFileSync(filePath, 'utf-8');
    } catch (err) {
      throw new DocumentIntelligenceInvalidInputError(
        `Could not read file for split: ${filePath}`,
        { filePath, cause: err },
      );
    }
  }

  // ---- Split on double newlines (section/paragraph boundaries) -----------
  const rawSegments = textToSplit
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const segments: DocumentSegment[] = rawSegments.map((text, index) => ({
    index,
    text,
  }));

  return normalizeSplitResult({ segments, rawResult: { segmentCount: segments.length } });
}
