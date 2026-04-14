/**
 * document-intelligence-core/errors.ts
 *
 * Structured error classes for the document intelligence core.
 * All errors carry a machine-readable `code` so callers can branch
 * without parsing message strings.
 */

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

export enum DocumentIntelligenceErrorCode {
  /** Required configuration (e.g. API key) is missing or invalid */
  CONFIG_ERROR = 'DOC_INTEL_CONFIG_ERROR',
  /** The requested provider is not registered */
  PROVIDER_NOT_FOUND = 'DOC_INTEL_PROVIDER_NOT_FOUND',
  /** The provider does not support the requested capability */
  CAPABILITY_NOT_SUPPORTED = 'DOC_INTEL_CAPABILITY_NOT_SUPPORTED',
  /** A provider-level API call failed */
  PROVIDER_ERROR = 'DOC_INTEL_PROVIDER_ERROR',
  /** The supplied input was invalid (missing fields, unsupported type, etc.) */
  INVALID_INPUT = 'DOC_INTEL_INVALID_INPUT',
  /** Document processing failed for a non-provider reason */
  PROCESSING_ERROR = 'DOC_INTEL_PROCESSING_ERROR',
  /** An unknown / unexpected error occurred */
  UNKNOWN = 'DOC_INTEL_UNKNOWN',
}

// ---------------------------------------------------------------------------
// Base
// ---------------------------------------------------------------------------

/**
 * Base class for all document-intelligence-core errors.
 * Carry a structured `code` plus an optional `cause` for wrapping lower-level
 * errors without losing the stack trace.
 */
export class DocumentIntelligenceError extends Error {
  readonly code: DocumentIntelligenceErrorCode;
  readonly details?: unknown;

  constructor(
    code: DocumentIntelligenceErrorCode,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = 'DocumentIntelligenceError';
    this.code = code;
    this.details = details;

    // Maintains proper prototype chain in transpiled ES5
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ---------------------------------------------------------------------------
// Specific error classes
// ---------------------------------------------------------------------------

/**
 * Thrown when required configuration (e.g. LLAMA_CLOUD_API_KEY) is absent
 * or malformed at the time a capability is invoked.
 */
export class DocumentIntelligenceConfigError extends DocumentIntelligenceError {
  constructor(message: string, details?: unknown) {
    super(DocumentIntelligenceErrorCode.CONFIG_ERROR, message, details);
    this.name = 'DocumentIntelligenceConfigError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when the requested provider is not registered in the registry.
 */
export class DocumentIntelligenceProviderNotFoundError extends DocumentIntelligenceError {
  constructor(provider: string) {
    super(
      DocumentIntelligenceErrorCode.PROVIDER_NOT_FOUND,
      `Document intelligence provider "${provider}" is not registered.`,
      { provider },
    );
    this.name = 'DocumentIntelligenceProviderNotFoundError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a provider is registered but does not implement the
 * requested capability.
 */
export class DocumentCapabilityNotSupportedError extends DocumentIntelligenceError {
  constructor(provider: string, capability: string) {
    super(
      DocumentIntelligenceErrorCode.CAPABILITY_NOT_SUPPORTED,
      `Provider "${provider}" does not support the "${capability}" capability.`,
      { provider, capability },
    );
    this.name = 'DocumentCapabilityNotSupportedError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when the provider's API call itself fails (network error,
 * rate limit, invalid response, etc.).
 */
export class DocumentIntelligenceProviderError extends DocumentIntelligenceError {
  constructor(provider: string, message: string, details?: unknown) {
    super(
      DocumentIntelligenceErrorCode.PROVIDER_ERROR,
      `Provider "${provider}" error: ${message}`,
      details,
    );
    this.name = 'DocumentIntelligenceProviderError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when the caller supplies invalid input (missing fields,
 * unsupported file type, etc.).
 */
export class DocumentIntelligenceInvalidInputError extends DocumentIntelligenceError {
  constructor(message: string, details?: unknown) {
    super(DocumentIntelligenceErrorCode.INVALID_INPUT, message, details);
    this.name = 'DocumentIntelligenceInvalidInputError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when document processing fails for a reason not attributable to
 * provider API errors or invalid input (e.g. normalizer crash).
 */
export class DocumentProcessingError extends DocumentIntelligenceError {
  constructor(message: string, details?: unknown) {
    super(DocumentIntelligenceErrorCode.PROCESSING_ERROR, message, details);
    this.name = 'DocumentProcessingError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
