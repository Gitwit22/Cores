/**
 * document-intelligence-core/documentIntelligence.ts
 *
 * Primary public API for the document intelligence core.
 *
 * All app code should import from this namespace object:
 *
 *   import { documentIntelligence } from '@nxtlvl/document-intelligence-core';
 *
 *   await documentIntelligence.parseDocument({ filePath: '/tmp/doc.pdf' });
 *   await documentIntelligence.classifyDocument({ filePath: '/tmp/doc.pdf' });
 *   await documentIntelligence.extractDocument({ filePath: '/tmp/doc.pdf' }, schema);
 *   await documentIntelligence.splitDocument({ filePath: '/tmp/doc.pdf' });
 *   await documentIntelligence.indexDocument({ filePath: '/tmp/doc.pdf' });
 *   await documentIntelligence.processDocument({ filePath: '/tmp/doc.pdf' }, opts);
 *   documentIntelligence.getCapabilities('llama-cloud');
 *
 * This namespace is the stable contract — provider internals, adapters,
 * and normalizers are implementation details and must not be imported directly
 * by app or product code.
 */

import { parseDocument, type ParseDocumentOptions } from './services/parseDocument.js';
import { classifyDocument, type ClassifyDocumentOptions } from './services/classifyDocument.js';
import { extractDocument, type ExtractDocumentOptions } from './services/extractDocument.js';
import { splitDocument, type SplitDocumentOptions } from './services/splitDocument.js';
import { indexDocument, type IndexDocumentOptions } from './services/indexDocument.js';
import { processDocument } from './orchestrator.js';
import {
  getProviderCapabilityMatrix,
  listAllProviderCapabilities,
} from './registry.js';
import type {
  DocumentSourceInput,
  ProcessDocumentOptions,
  ProcessDocumentResult,
  NormalizedParseResult,
  NormalizedClassificationResult,
  NormalizedExtractionResult,
  NormalizedSplitResult,
  NormalizedIndexResult,
  DocumentIntelligenceProvider,
  ProviderCapabilityMatrix,
} from './types.js';

// ---------------------------------------------------------------------------
// Namespace interface (for documentation & consumer type-checking)
// ---------------------------------------------------------------------------

export interface DocumentIntelligenceNamespace {
  /**
   * Parse a document into normalized text / markdown output.
   */
  parseDocument(
    input: DocumentSourceInput,
    options?: ParseDocumentOptions,
  ): Promise<NormalizedParseResult>;

  /**
   * Classify a document into a known type.
   */
  classifyDocument(
    input: DocumentSourceInput,
    options?: ClassifyDocumentOptions,
  ): Promise<NormalizedClassificationResult>;

  /**
   * Extract structured fields from a document using a caller-supplied schema.
   */
  extractDocument(
    input: DocumentSourceInput,
    schema: unknown,
    options?: ExtractDocumentOptions,
  ): Promise<NormalizedExtractionResult>;

  /**
   * Split a document into logical segments.
   */
  splitDocument(
    input: DocumentSourceInput,
    options?: SplitDocumentOptions,
  ): Promise<NormalizedSplitResult>;

  /**
   * Index a document for later semantic retrieval.
   */
  indexDocument(
    input: DocumentSourceInput,
    options?: IndexDocumentOptions,
  ): Promise<NormalizedIndexResult>;

  /**
   * Run a multi-capability pipeline in a single call.
   *
   * Flags in `options` control which capabilities execute.
   * Partial results are always returned — a capability failure does not
   * abort unrelated capabilities (except parse failure stops downstream).
   */
  processDocument(
    input: DocumentSourceInput,
    options?: ProcessDocumentOptions,
  ): Promise<ProcessDocumentResult>;

  /**
   * Returns the capability matrix for a specific provider.
   *
   * @example
   *   documentIntelligence.getCapabilities('llama-cloud');
   *   // { provider: 'llama-cloud', capabilities: ['parse', 'classify', ...], available: true }
   */
  getCapabilities(provider: DocumentIntelligenceProvider): ProviderCapabilityMatrix;

  /**
   * Returns capability matrices for all registered providers.
   */
  listAllCapabilities(): ProviderCapabilityMatrix[];
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * The document intelligence namespace object.
 *
 * Import this in app code — never import provider modules directly.
 */
export const documentIntelligence: DocumentIntelligenceNamespace = {
  parseDocument,
  classifyDocument,
  extractDocument,
  splitDocument,
  indexDocument,
  processDocument,
  getCapabilities: getProviderCapabilityMatrix,
  listAllCapabilities: listAllProviderCapabilities,
};
