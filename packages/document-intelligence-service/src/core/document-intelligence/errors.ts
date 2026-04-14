export class DocumentIntelligenceError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(code: string, message: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = 'DocumentIntelligenceError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class DocumentIntelligenceConfigError extends DocumentIntelligenceError {
  constructor(message: string, details?: unknown) {
    super('DOC_INTEL_CONFIG_ERROR', message, 500, details);
    this.name = 'DocumentIntelligenceConfigError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class DocumentIntelligenceInvalidInputError extends DocumentIntelligenceError {
  constructor(message: string, details?: unknown) {
    super('DOC_INTEL_INVALID_INPUT', message, 400, details);
    this.name = 'DocumentIntelligenceInvalidInputError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class DocumentCapabilityNotSupportedError extends DocumentIntelligenceError {
  constructor(provider: string, capability: string) {
    super(
      'DOC_INTEL_CAPABILITY_NOT_SUPPORTED',
      `Provider "${provider}" does not support capability "${capability}".`,
      400,
      { provider, capability },
    );
    this.name = 'DocumentCapabilityNotSupportedError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class DocumentProviderNotFoundError extends DocumentIntelligenceError {
  constructor(provider: string) {
    super(
      'DOC_INTEL_PROVIDER_NOT_FOUND',
      `Provider "${provider}" is not registered.`,
      500,
      { provider },
    );
    this.name = 'DocumentProviderNotFoundError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class DocumentProviderError extends DocumentIntelligenceError {
  constructor(provider: string, message: string, details?: unknown) {
    super('DOC_INTEL_PROVIDER_ERROR', `Provider "${provider}" error: ${message}`, 502, details);
    this.name = 'DocumentProviderError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
