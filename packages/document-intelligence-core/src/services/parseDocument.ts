/**
 * document-intelligence-core/services/parseDocument.ts
 *
 * Service entry point for the parse capability.
 *
 * Validates input, resolves the provider, delegates to the adapter, applies
 * logging, and returns a normalized result. App code should import this
 * function, not call provider code directly.
 */

import type { DocumentSourceInput, NormalizedParseResult } from '../types.js';
import type { DocumentIntelligenceProvider } from '../types.js';
import { resolveProvider, assertCapabilitySupported } from '../registry.js';
import {
  logProviderSelected,
  logCapabilityStart,
  logCapabilityComplete,
  logCapabilityError,
} from '../logger.js';
import { DocumentIntelligenceInvalidInputError } from '../errors.js';
import { getDocumentIntelligenceConfig } from '../config.js';

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface ParseDocumentOptions {
  provider?: DocumentIntelligenceProvider;
}

// ---------------------------------------------------------------------------
// Service function
// ---------------------------------------------------------------------------

/**
 * Parse a document and return a normalized result.
 *
 * @param input - Source document descriptor (filePath required)
 * @param options - Optional provider override
 */
export async function parseDocument(
  input: DocumentSourceInput,
  options?: ParseDocumentOptions,
): Promise<NormalizedParseResult> {
  // ---- Input validation --------------------------------------------------
  if (!input || !input.filePath || input.filePath.trim() === '') {
    throw new DocumentIntelligenceInvalidInputError(
      'parseDocument requires a non-empty filePath.',
      { input },
    );
  }

  const config = getDocumentIntelligenceConfig();
  if (!config.enabledCapabilities.includes('parse')) {
    return {
      provider: options?.provider ?? config.defaultProvider,
      status: 'failed',
      text: '',
      markdown: '',
      confidence: null,
      rawResult: { reason: 'parse capability is disabled in config' },
    };
  }

  // ---- Resolve provider --------------------------------------------------
  const adapter = resolveProvider(options?.provider);
  assertCapabilitySupported(adapter, 'parse');
  logProviderSelected(adapter.provider, 'parse', input.documentId);

  const ctx = {
    capability: 'parse' as const,
    provider: adapter.provider,
    documentId: input.documentId,
    jobId: input.jobId,
    fileName: input.fileName,
    mimeType: input.mimeType,
  };

  // ---- Dry-run short-circuit --------------------------------------------
  if (config.dryRun) {
    logCapabilityComplete({ ...ctx, durationMs: 0, status: 'skipped' });
    return {
      provider: adapter.provider,
      status: 'complete',
      text: '[dry-run]',
      markdown: '[dry-run]',
      confidence: null,
      rawResult: { dryRun: true },
    };
  }

  // ---- Invoke adapter ----------------------------------------------------
  logCapabilityStart(ctx);
  const startMs = Date.now();

  try {
    const result = await adapter.parse!(input);
    logCapabilityComplete({
      ...ctx,
      durationMs: Date.now() - startMs,
      status: result.status,
      confidence: result.confidence,
    });
    return result;
  } catch (err) {
    logCapabilityError(ctx, err, Date.now() - startMs);
    throw err;
  }
}
