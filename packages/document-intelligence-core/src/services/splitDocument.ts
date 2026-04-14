/**
 * document-intelligence-core/services/splitDocument.ts
 *
 * Service entry point for the split capability.
 */

import type {
  DocumentSourceInput,
  NormalizedSplitResult,
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

export interface SplitDocumentOptions {
  provider?: DocumentIntelligenceProvider;
}

// ---------------------------------------------------------------------------
// Service function
// ---------------------------------------------------------------------------

/**
 * Split a document into logical segments and return a normalized result.
 *
 * @param input   - Source document descriptor
 * @param options - Optional provider override
 */
export async function splitDocument(
  input: DocumentSourceInput,
  options?: SplitDocumentOptions,
): Promise<NormalizedSplitResult> {
  // ---- Input validation --------------------------------------------------
  if (!input || !input.filePath || input.filePath.trim() === '') {
    throw new DocumentIntelligenceInvalidInputError(
      'splitDocument requires a non-empty filePath.',
      { input },
    );
  }

  const config = getDocumentIntelligenceConfig();
  if (!config.enabledCapabilities.includes('split')) {
    return {
      provider: options?.provider ?? config.defaultProvider,
      status: 'skipped',
      segments: [],
      rawResult: { reason: 'split capability is disabled in config' },
    };
  }

  // ---- Resolve provider --------------------------------------------------
  const adapter = resolveProvider(options?.provider);
  assertCapabilitySupported(adapter, 'split');
  logProviderSelected(adapter.provider, 'split', input.documentId);

  const ctx = {
    capability: 'split' as const,
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
      segments: [],
      rawResult: { dryRun: true },
    };
  }

  // ---- Invoke adapter ----------------------------------------------------
  logCapabilityStart(ctx);
  const startMs = Date.now();

  try {
    const result = await adapter.split!(input);
    logCapabilityComplete({
      ...ctx,
      durationMs: Date.now() - startMs,
      status: result.status,
      extra: { segmentCount: result.segments.length },
    });
    return result;
  } catch (err) {
    logCapabilityError(ctx, err, Date.now() - startMs);
    throw err;
  }
}
