/**
 * document-intelligence-core/types.ts
 *
 * Provider-agnostic normalized types for the document intelligence core.
 * These are the internal source of truth — all provider adapters must map
 * their raw responses to these shapes before returning results to callers.
 *
 * App code should import from here and never reference provider-specific
 * response shapes directly.
 */

// ---------------------------------------------------------------------------
// Provider & Capability identifiers
// ---------------------------------------------------------------------------

/**
 * Known document intelligence providers.
 * Extend this union when a new provider adapter is registered.
 *
 * Current implementation uses Llama Cloud as the active working provider.
 * The architecture intentionally allows future provider replacement or
 * multi-provider support without rewriting app business logic.
 */
export type DocumentIntelligenceProvider = 'llama-cloud' | 'mock' | 'unknown';

/**
 * Discrete capabilities that a provider adapter may support.
 */
export type DocumentCapability =
  | 'parse'
  | 'classify'
  | 'extract'
  | 'split'
  | 'index'
  | 'sheets';

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

/**
 * Source input describing the document to process.
 * Intentionally generic — works for PDFs, images, scanned forms, receipts, etc.
 */
export interface DocumentSourceInput {
  /** Absolute local path to the file on disk */
  filePath: string;
  /** Human-readable file name (used for logging and provider upload) */
  fileName?: string;
  /** MIME type hint, e.g. "application/pdf" or "image/jpeg" */
  mimeType?: string;
  /** Optional document ID from the calling application */
  documentId?: string;
  /** Optional job ID from the calling application (for tracing) */
  jobId?: string;
}

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

/**
 * Normalized result of a document parse operation.
 * Provider-specific details should be relegated to `rawResult`.
 */
export interface NormalizedParseResult {
  provider: DocumentIntelligenceProvider;
  status: 'complete' | 'failed';
  /** Plain-text representation of the document */
  text: string;
  /** Markdown representation of the document */
  markdown: string;
  /** Overall confidence score [0–1] when the provider returns one */
  confidence: number | null;
  /** Per-page metadata when available */
  pages?: unknown[];
  /** Extracted table structures when available */
  tables?: unknown[];
  /** Extracted images/figures when available */
  images?: unknown[];
  /** Raw provider response for debugging / audit — do not expose to UI */
  rawResult?: unknown;
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

/**
 * Normalized result of a document classification operation.
 */
export interface NormalizedClassificationResult {
  provider: DocumentIntelligenceProvider;
  status: 'complete' | 'failed' | 'skipped';
  /** Canonical document type, or null if unknown */
  documentType: string | null;
  /** Confidence score [0–1] when the provider returns one */
  confidence: number | null;
  /** Free-text explanation of the classification decision */
  reasoning: string | null;
  /** Additional category labels when available */
  labels?: string[];
  /** Raw provider response for debugging / audit */
  rawResult?: unknown;
}

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

/**
 * A single extracted key/value field from a document.
 */
export interface ExtractedFieldValue {
  /** Schema key for this field */
  key: string;
  /** Extracted value (type depends on schema) */
  value: unknown;
  /** Per-field confidence score [0–1] when available */
  confidence?: number | null;
}

/**
 * Normalized result of a schema-driven extraction operation.
 */
export interface NormalizedExtractionResult {
  provider: DocumentIntelligenceProvider;
  status: 'complete' | 'failed' | 'skipped';
  /** Name of the schema used for extraction, if available */
  schemaName?: string | null;
  /** Extracted key/value pairs */
  fields: ExtractedFieldValue[];
  /** Overall extraction confidence [0–1] when available */
  confidence: number | null;
  /** Raw provider response for debugging / audit */
  rawResult?: unknown;
}

// ---------------------------------------------------------------------------
// Split
// ---------------------------------------------------------------------------

/**
 * A single logical segment produced by a split operation.
 */
export interface DocumentSegment {
  /** 0-based segment index */
  index: number;
  /** Plain-text content of this segment */
  text: string;
  /** Page range this segment covers, when available */
  pages?: { start: number; end: number };
  /** Arbitrary provider metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Normalized result of a document split operation.
 */
export interface NormalizedSplitResult {
  provider: DocumentIntelligenceProvider;
  status: 'complete' | 'failed' | 'skipped';
  segments: DocumentSegment[];
  /** Raw provider response for debugging / audit */
  rawResult?: unknown;
}

// ---------------------------------------------------------------------------
// Index
// ---------------------------------------------------------------------------

/**
 * Normalized result of a document index operation.
 * Indexing stores parsed content in a retrieval-ready form (vector store, etc.).
 */
export interface NormalizedIndexResult {
  provider: DocumentIntelligenceProvider;
  status: 'complete' | 'failed' | 'skipped';
  /** Provider-assigned ID for the indexed document */
  indexId?: string | null;
  /** Number of chunks / nodes indexed */
  chunksIndexed?: number | null;
  /** Raw provider response for debugging / audit */
  rawResult?: unknown;
}

// ---------------------------------------------------------------------------
// Capabilities matrix
// ---------------------------------------------------------------------------

/**
 * Describes which capabilities a registered provider supports.
 */
export interface ProviderCapabilityMatrix {
  provider: DocumentIntelligenceProvider;
  capabilities: DocumentCapability[];
  /** Whether the provider is currently available (key present, etc.) */
  available: boolean;
}

// ---------------------------------------------------------------------------
// Process (combined pipeline)
// ---------------------------------------------------------------------------

/**
 * Options controlling which capabilities are run in a processDocument call.
 */
export interface ProcessDocumentOptions {
  /** Run parse capability (default: true) */
  parse?: boolean;
  /** Run classify capability */
  classify?: boolean;
  /** Run extract capability */
  extract?: boolean;
  /** Run split capability */
  split?: boolean;
  /** Run index capability */
  index?: boolean;
  /** Schema passed to the extract capability */
  extractionSchema?: unknown;
  /** Override the default provider for this call */
  provider?: DocumentIntelligenceProvider;
}

/**
 * Combined result returned by processDocument.
 * Fields are present only for capabilities that were requested.
 */
export interface ProcessDocumentResult {
  parse?: NormalizedParseResult;
  classify?: NormalizedClassificationResult;
  extract?: NormalizedExtractionResult;
  split?: NormalizedSplitResult;
  index?: NormalizedIndexResult;
}
