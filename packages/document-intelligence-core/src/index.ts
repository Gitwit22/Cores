/**
 * document-intelligence-core — public API
 *
 * PRIMARY ENTRY POINT
 * -------------------
 * App code should import the namespace object:
 *
 *   import { documentIntelligence } from '@nxtlvl/document-intelligence-core';
 *
 * SECONDARY (individual service functions, types, errors, config)
 * ---------------------------------------------------------------
 * Individual exports are available for tree-shaking and fine-grained imports.
 */

// ---------------------------------------------------------------------------
// Primary namespace (recommended import for app code)
// ---------------------------------------------------------------------------

export { documentIntelligence } from './documentIntelligence.js';
export type { DocumentIntelligenceNamespace } from './documentIntelligence.js';

// ---------------------------------------------------------------------------
// Service functions (flat imports for app code that prefers them)
// ---------------------------------------------------------------------------

export { parseDocument } from './services/parseDocument.js';
export { classifyDocument } from './services/classifyDocument.js';
export { extractDocument } from './services/extractDocument.js';
export { splitDocument } from './services/splitDocument.js';
export { indexDocument } from './services/indexDocument.js';
export { processDocument } from './orchestrator.js';

export type { ParseDocumentOptions } from './services/parseDocument.js';
export type { ClassifyDocumentOptions } from './services/classifyDocument.js';
export type { ExtractDocumentOptions } from './services/extractDocument.js';
export type { SplitDocumentOptions } from './services/splitDocument.js';
export type { IndexDocumentOptions } from './services/indexDocument.js';

// ---------------------------------------------------------------------------
// Normalized types
// ---------------------------------------------------------------------------

export type {
  DocumentIntelligenceProvider,
  DocumentCapability,
  DocumentSourceInput,
  NormalizedParseResult,
  NormalizedClassificationResult,
  NormalizedExtractionResult,
  NormalizedSplitResult,
  NormalizedIndexResult,
  ExtractedFieldValue,
  DocumentSegment,
  ProcessDocumentOptions,
  ProcessDocumentResult,
  ProviderCapabilityMatrix,
} from './types.js';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export {
  DocumentIntelligenceErrorCode,
  DocumentIntelligenceError,
  DocumentIntelligenceConfigError,
  DocumentIntelligenceProviderNotFoundError,
  DocumentCapabilityNotSupportedError,
  DocumentIntelligenceProviderError,
  DocumentIntelligenceInvalidInputError,
  DocumentProcessingError,
} from './errors.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export {
  configureDocumentIntelligence,
  getDocumentIntelligenceConfig,
  resolveConfig,
  CHRONICLE_DEFAULT_CATEGORIES,
} from './config.js';
export type { DocumentIntelligenceConfig } from './config.js';

// ---------------------------------------------------------------------------
// Registry (for advanced / plugin use only)
// ---------------------------------------------------------------------------

export {
  getDocumentIntelligenceProvider,
  getDefaultDocumentIntelligenceProvider,
  resolveProvider,
  getProviderCapabilityMatrix,
  listAllProviderCapabilities,
  registerProvider,
} from './registry.js';

// ---------------------------------------------------------------------------
// Provider adapter contract (for implementors of custom providers)
// ---------------------------------------------------------------------------

export type { DocumentIntelligenceAdapter } from './providers/base.js';

// ---------------------------------------------------------------------------
// Extraction schema types (exported for callers building schemas)
// ---------------------------------------------------------------------------

export type {
  ExtractionFieldSchema,
  ExtractionSchema,
} from './providers/llamaCloud/extract.js';

// ---------------------------------------------------------------------------
// Llama Cloud provider config (for advanced tuning)
// ---------------------------------------------------------------------------

export {
  configureLlamaCloudProvider,
  getLlamaCloudProviderConfig,
  resetLlamaCloudClient,
} from './providers/llamaCloud/client.js';
export type { LlamaCloudProviderConfig } from './providers/llamaCloud/client.js';

// ---------------------------------------------------------------------------
// Mock adapter (for tests and dry-run environments)
// ---------------------------------------------------------------------------

export { mockAdapter } from './providers/mock/adapter.js';
