import type { NormalizedParseResult } from '../types.js';

interface LlamaMarkdownPage {
  markdown?: string;
  page_number?: number;
}

interface LlamaParseResponse {
  job?: {
    status?: string;
  };
  markdown?: {
    pages?: LlamaMarkdownPage[];
  } | null;
}

export function normalizeParseResult(rawResponse: unknown): NormalizedParseResult {
  const response = rawResponse as LlamaParseResponse;
  const pages = response?.markdown?.pages ?? [];
  const markdown = pages
    .map((page) => page.markdown ?? '')
    .filter((value) => value !== '')
    .join('\n\n')
    .trim();
  const text = markdown
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[(.+?)\]\(.*?\)/g, '$1')
    .trim();
  const status = response?.job?.status === 'SUCCESS' || markdown !== '' ? 'complete' : 'failed';

  return {
    provider: 'llama-cloud',
    status,
    text,
    markdown,
    confidence: null,
    pages: pages.map((page) => ({ pageNumber: page.page_number ?? null })),
  };
}
