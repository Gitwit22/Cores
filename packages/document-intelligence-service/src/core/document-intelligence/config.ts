import type { DocumentIntelligenceProvider } from './types.js';

export interface DocumentIntelligenceConfig {
  provider: DocumentIntelligenceProvider;
  maxUploadBytes: number;
}

const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function getDocumentIntelligenceConfig(): DocumentIntelligenceConfig {
  const providerEnv = process.env.DOC_INTEL_PROVIDER?.trim();
  const provider = (providerEnv === 'llama-cloud' ? providerEnv : 'llama-cloud') satisfies DocumentIntelligenceProvider;
  const maxUploadEnv = Number(process.env.DOC_INTEL_MAX_UPLOAD_BYTES);

  return {
    provider,
    maxUploadBytes: Number.isFinite(maxUploadEnv) && maxUploadEnv > 0
      ? Math.floor(maxUploadEnv)
      : DEFAULT_MAX_UPLOAD_BYTES,
  };
}
