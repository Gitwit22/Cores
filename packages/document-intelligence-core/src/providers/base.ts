/**
 * document-intelligence-core/providers/base.ts
 *
 * Provider adapter contract.
 *
 * Every document intelligence provider (Llama Cloud, future providers, mock)
 * must implement this interface. The rest of the app never calls provider
 * code directly — it goes through the service layer which resolves the
 * adapter via the registry.
 *
 * Current implementation uses Llama Cloud as the active working provider.
 * The architecture intentionally allows future provider replacement or
 * multi-provider support without rewriting app business logic.
 */

import type {
  DocumentCapability,
  DocumentIntelligenceProvider,
  DocumentSourceInput,
  NormalizedClassificationResult,
  NormalizedExtractionResult,
  NormalizedIndexResult,
  NormalizedParseResult,
  NormalizedSplitResult,
} from '../types.js';

// ---------------------------------------------------------------------------
// Adapter interface
// ---------------------------------------------------------------------------

/**
 * Every provider adapter must satisfy this interface.
 *
 * Capabilities are optional — a provider declares what it supports via
 * `supports()`, and the service layer checks before calling. Attempting to
 * call an unsupported capability throws `DocumentCapabilityNotSupportedError`.
 */
export interface DocumentIntelligenceAdapter {
  /** Identifies which provider this adapter represents */
  readonly provider: DocumentIntelligenceProvider;

  /**
   * Returns true if this adapter implements the given capability.
   * Used by the registry and orchestrator before dispatching a call.
   */
  supports(capability: DocumentCapability): boolean;

  /**
   * Parse a document into normalized text / markdown output.
   * Defined only when `supports("parse")` returns true.
   */
  parse?(input: DocumentSourceInput): Promise<NormalizedParseResult>;

  /**
   * Classify a document into a known type.
   * Defined only when `supports("classify")` returns true.
   */
  classify?(
    input: DocumentSourceInput,
    categories?: readonly string[],
  ): Promise<NormalizedClassificationResult>;

  /**
   * Extract structured fields from a document according to a schema.
   * Defined only when `supports("extract")` returns true.
   */
  extract?(
    input: DocumentSourceInput,
    schema: unknown,
  ): Promise<NormalizedExtractionResult>;

  /**
   * Split a document into logical segments.
   * Defined only when `supports("split")` returns true.
   */
  split?(input: DocumentSourceInput): Promise<NormalizedSplitResult>;

  /**
   * Index a document for later retrieval.
   * Defined only when `supports("index")` returns true.
   */
  index?(input: DocumentSourceInput): Promise<NormalizedIndexResult>;
}
