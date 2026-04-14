/**
 * document-intelligence-core/services/indexDocument.ts
 *
 * Service entry point for the index capability.
 */

import type {
  DocumentSourceInput,
  NormalizedIndexResult,
  DocumentIntelligenceProvider,
} from '../types.js';
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

export interface IndexDocumentOptions {
  provider?: DocumentIntelligenceProvider;
}

// ---------------------------------------------------------------------------
// Service function
// ---------------------------------------------------------------------------

/**
 * Index a document for later semantic retrieval and return a normalized result.
 *
 * @param input   - Source document descriptor
 * @param options - Optional provider override
 */
export async function indexDocument(
  input: DocumentSourceInput,
  options?: IndexDocumentOptions,
): Promise<NormalizedIndexResult> {
  // ---- Input validation --------------------------------------------------
  if (!input || !input.filePath || input.filePath.trim() === '') {
    throw new DocumentIntelligenceInvalidInputError(
      'indexDocument requires a non-empty filePath.',
      { input },
    );
  }

  const config = getDocumentIntelligenceConfig();
  if (!config.enabledCapabilities.includes('index')) {
    return {
      provider: options?.provider ?? config.defaultProvider,
      status: 'skipped',
      rawResult: { reason: 'index capability is disabled in config' },
    };
  }

  // ---- Resolve provider --------------------------------------------------
  const adapter = resolveProvider(options?.provider);
  assertCapabilitySupported(adapter, 'index');
  logProviderSelected(adapter.provider, 'index', input.documentId);

  const ctx = {
    capability: 'index' as const,
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
      status: 'skipped',
      rawResult: { dryRun: true },
    };
  }

  // ---- Invoke adapter ----------------------------------------------------
  logCapabilityStart(ctx);
  const startMs = Date.now();

  try {
    const result = await adapter.index!(input);
    logCapabilityComplete({
      ...ctx,
      durationMs: Date.now() - startMs,
      status: result.status,
      extra: { indexId: result.indexId, chunksIndexed: result.chunksIndexed },
    });
    return result;
  } catch (err) {
    logCapabilityError(ctx, err, Date.now() - startMs);
    throw err;
  }
}
