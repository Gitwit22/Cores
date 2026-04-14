/**
 * document-intelligence-core/normalizers/parseNormalizer.ts
 *
 * Maps raw Llama Cloud ParsingGetResponse into NormalizedParseResult.
 * All provider-specific field names must stay inside this file.
 */

import type { NormalizedParseResult } from '../types.js';

// ---------------------------------------------------------------------------
// Llama Cloud response shapes (internal — not exported)
// ---------------------------------------------------------------------------

interface LlamaMarkdownPage {
  markdown: string;
  page_number?: number;
}

interface LlamaMarkdownResult {
  pages?: LlamaMarkdownPage[];
}

interface LlamaParsingGetResponse {
  job?: {
    status?: string;
    id?: string;
  };
  markdown?: LlamaMarkdownResult | null;
  text?: { content?: string } | null;
  items?: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// Normalizer
// ---------------------------------------------------------------------------

/**
 * Convert a raw LlamaCloud ParsingGetResponse to NormalizedParseResult.
 */
export function normalizeParseResult(
  rawResponse: unknown,
  _fileName?: string,
): NormalizedParseResult {
  const response = rawResponse as LlamaParsingGetResponse;
  const jobStatus = response?.job?.status ?? '';
  const isFailed = jobStatus === 'ERROR' || jobStatus === 'CANCELLED';

  // ---- Assemble markdown from per-page results ---------------------------
  const pages = response?.markdown?.pages ?? [];
  const markdownParts: string[] = pages
    .map((p) => (typeof p.markdown === 'string' ? p.markdown : ''))
    .filter((s) => s.length > 0);

  const markdown = markdownParts.join('\n\n').trim();

  // ---- Plain text: strip common markdown syntax --------------------------
  const plainText = markdown
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[(.+?)\]\(.*?\)/g, '$1')
    .trim();

  const pageMetadata = pages.map((p) => ({
    page_number: p.page_number,
    length: p.markdown?.length ?? 0,
  }));

  return {
    provider: 'llama-cloud',
    status: isFailed || (markdown === '' && jobStatus !== 'SUCCESS') ? 'failed' : 'complete',
    text: plainText,
    markdown,
    confidence: null, // Llama Cloud parse API does not return a top-level confidence score
    pages: pageMetadata.length > 0 ? pageMetadata : undefined,
    tables: undefined,
    images: undefined,
    rawResult: rawResponse,
  };
}
