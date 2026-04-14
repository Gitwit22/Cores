/**
 * document-intelligence-core/services/extractDocument.ts
 *
 * Service entry point for the extract capability.
 */

import type {
  DocumentSourceInput,
  NormalizedExtractionResult,
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

export interface ExtractDocumentOptions {
  provider?: DocumentIntelligenceProvider;
}

// ---------------------------------------------------------------------------
// Service function
// ---------------------------------------------------------------------------

/**
 * Extract structured fields from a document using a caller-supplied schema.
 *
 * @param input  - Source document descriptor
 * @param schema - Extraction schema (ExtractionSchema from the Llama Cloud provider)
 * @param options - Optional provider override
 */
export async function extractDocument(
  input: DocumentSourceInput,
  schema: unknown,
  options?: ExtractDocumentOptions,
): Promise<NormalizedExtractionResult> {
  // ---- Input validation --------------------------------------------------
  if (!input) {
    throw new DocumentIntelligenceInvalidInputError(
      'extractDocument requires a DocumentSourceInput.',
      { input },
    );
  }
  if (!schema) {
    throw new DocumentIntelligenceInvalidInputError(
      'extractDocument requires a schema.',
      { schema },
    );
  }

  const config = getDocumentIntelligenceConfig();
  if (!config.enabledCapabilities.includes('extract')) {
    return {
      provider: options?.provider ?? config.defaultProvider,
      status: 'skipped',
      fields: [],
      confidence: null,
      rawResult: { reason: 'extract capability is disabled in config' },
    };
  }

  // ---- Resolve provider --------------------------------------------------
  const adapter = resolveProvider(options?.provider);
  assertCapabilitySupported(adapter, 'extract');
  logProviderSelected(adapter.provider, 'extract', input.documentId);

  const ctx = {
    capability: 'extract' as const,
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
      fields: [],
      confidence: null,
      rawResult: { dryRun: true },
    };
  }

  // ---- Invoke adapter ----------------------------------------------------
  logCapabilityStart(ctx);
  const startMs = Date.now();

  try {
    const result = await adapter.extract!(input, schema);
    logCapabilityComplete({
      ...ctx,
      durationMs: Date.now() - startMs,
      status: result.status,
      confidence: result.confidence,
      extra: { fieldCount: result.fields.length },
    });
    return result;
  } catch (err) {
    logCapabilityError(ctx, err, Date.now() - startMs);
    throw err;
  }
}
