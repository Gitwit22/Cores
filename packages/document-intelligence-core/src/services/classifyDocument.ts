/**
 * document-intelligence-core/services/classifyDocument.ts
 *
 * Service entry point for the classify capability.
 */

import type {
  DocumentSourceInput,
  NormalizedClassificationResult,
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

export interface ClassifyDocumentOptions {
  provider?: DocumentIntelligenceProvider;
  /** Override the category list for this call */
  categories?: readonly string[];
}

// ---------------------------------------------------------------------------
// Service function
// ---------------------------------------------------------------------------

/**
 * Classify a document and return a normalized result.
 *
 * @param input - Source document descriptor; supply parsedText via options if
 *                the document has already been parsed to avoid a redundant
 *                API call.
 * @param options - Optional provider and category overrides
 */
export async function classifyDocument(
  input: DocumentSourceInput,
  options?: ClassifyDocumentOptions,
): Promise<NormalizedClassificationResult> {
  // ---- Input validation --------------------------------------------------
  if (!input) {
    throw new DocumentIntelligenceInvalidInputError(
      'classifyDocument requires a DocumentSourceInput.',
      { input },
    );
  }

  const config = getDocumentIntelligenceConfig();
  if (!config.enabledCapabilities.includes('classify')) {
    return {
      provider: options?.provider ?? config.defaultProvider,
      status: 'skipped',
      documentType: null,
      confidence: null,
      reasoning: 'classify capability is disabled in config',
    };
  }

  // ---- Resolve provider --------------------------------------------------
  const adapter = resolveProvider(options?.provider);
  assertCapabilitySupported(adapter, 'classify');
  logProviderSelected(adapter.provider, 'classify', input.documentId);

  const ctx = {
    capability: 'classify' as const,
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
      documentType: null,
      confidence: null,
      reasoning: 'dry-run mode',
      rawResult: { dryRun: true },
    };
  }

  // ---- Invoke adapter ----------------------------------------------------
  logCapabilityStart(ctx);
  const startMs = Date.now();

  try {
    const categories = options?.categories ?? config.classificationCategories;
    const result = await adapter.classify!(input, categories);
    logCapabilityComplete({
      ...ctx,
      durationMs: Date.now() - startMs,
      status: result.status,
      confidence: result.confidence,
      extra: { documentType: result.documentType },
    });
    return result;
  } catch (err) {
    logCapabilityError(ctx, err, Date.now() - startMs);
    throw err;
  }
}
