import type { DocumentIntelligenceProvider } from './types.js';

export interface DocumentIntelligenceConfig {
  provider: DocumentIntelligenceProvider;
  maxUploadBytes: number;
  llamaParseTier: 'fast' | 'cost_effective' | 'agentic' | 'agentic_plus';
  llamaParseVersion: string;
}

const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const DEFAULT_LLAMA_PARSE_TIER: DocumentIntelligenceConfig['llamaParseTier'] = 'cost_effective';
const DEFAULT_LLAMA_PARSE_VERSION = 'latest';

export function getDocumentIntelligenceConfig(): DocumentIntelligenceConfig {
  const providerEnv = process.env.DEFAULT_DOCUMENT_PROVIDER?.trim();
  const provider = (providerEnv === 'llama-cloud' ? providerEnv : 'llama-cloud') satisfies DocumentIntelligenceProvider;
  const maxUploadEnv = Number(process.env.DOC_INTEL_MAX_UPLOAD_BYTES);
  const parseTierEnv = process.env.LLAMA_CLOUD_PARSE_TIER?.trim();
  const parseTier: DocumentIntelligenceConfig['llamaParseTier'] = (
    parseTierEnv === 'fast'
    || parseTierEnv === 'cost_effective'
    || parseTierEnv === 'agentic'
    || parseTierEnv === 'agentic_plus'
  )
    ? parseTierEnv
    : DEFAULT_LLAMA_PARSE_TIER;
  const parseVersion = process.env.LLAMA_CLOUD_PARSE_VERSION?.trim() || DEFAULT_LLAMA_PARSE_VERSION;

  return {
    provider,
    maxUploadBytes: Number.isFinite(maxUploadEnv) && maxUploadEnv > 0
      ? Math.floor(maxUploadEnv)
      : DEFAULT_MAX_UPLOAD_BYTES,
    llamaParseTier: parseTier,
    llamaParseVersion: parseVersion,
  };
}
