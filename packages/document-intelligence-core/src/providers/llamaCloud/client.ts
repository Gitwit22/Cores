/**
 * document-intelligence-core/providers/llamaCloud/client.ts
 *
 * Centralized Llama Cloud SDK client.
 *
 * Rules:
 * - The API key is read from the environment variable LLAMA_CLOUD_API_KEY.
 * - The key is NEVER logged or exposed to frontend code.
 * - The client is created lazily on first use (singleton per process).
 * - A clear config error is thrown at invocation time if the key is absent.
 * - All Llama-SDK imports are isolated to this file and the provider folder.
 *
 * Current implementation uses Llama Cloud as the active working provider.
 * The architecture intentionally allows future provider replacement without
 * changing app or service layer code.
 */

import { LlamaCloud } from '@llamaindex/llama-cloud';
import { DocumentIntelligenceConfigError } from '../../errors.js';

// ---------------------------------------------------------------------------
// Types re-exported for use within the provider folder only
// ---------------------------------------------------------------------------

export type { LlamaCloud };

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_KEY_ENV = 'LLAMA_CLOUD_API_KEY';

/**
 * Llama Cloud provider-specific configuration.
 * All Llama-specific settings live here — not scattered across the codebase.
 */
export interface LlamaCloudProviderConfig {
  /**
   * Parse tier: 'fast' (rule-based), 'cost_effective' (balanced), 'agentic'
   * (AI-powered), or 'agentic_plus' (premium AI). Defaults to 'cost_effective'.
   */
  parseTier?: 'fast' | 'cost_effective' | 'agentic' | 'agentic_plus';
  /**
   * Parse version. Use 'latest' or a specific date string.
   */
  parseVersion?: string;
  /** Llama Cloud organization ID (optional) */
  organizationId?: string;
  /** Llama Cloud project ID (optional, used for scoping API calls) */
  projectId?: string;
}

const DEFAULT_PROVIDER_CONFIG: Required<LlamaCloudProviderConfig> = {
  parseTier: 'cost_effective',
  parseVersion: 'latest',
  organizationId: '',
  projectId: '',
};

let _providerConfig: Required<LlamaCloudProviderConfig> = DEFAULT_PROVIDER_CONFIG;

/**
 * Override Llama Cloud provider settings. Call before first use.
 */
export function configureLlamaCloudProvider(
  overrides: LlamaCloudProviderConfig,
): void {
  _providerConfig = { ...DEFAULT_PROVIDER_CONFIG, ...overrides };
}

export function getLlamaCloudProviderConfig(): Required<LlamaCloudProviderConfig> {
  return _providerConfig;
}

// ---------------------------------------------------------------------------
// API key helper
// ---------------------------------------------------------------------------

/**
 * Returns the Llama Cloud API key from the environment.
 * Throws `DocumentIntelligenceConfigError` if the key is absent.
 * Never logs or exposes the key value.
 */
export function requireLlamaCloudApiKey(): string {
  const key = process.env[API_KEY_ENV];
  if (!key || key.trim() === '') {
    throw new DocumentIntelligenceConfigError(
      `Llama Cloud API key is missing. Set the ${API_KEY_ENV} environment variable before invoking document intelligence capabilities.`,
      { envVar: API_KEY_ENV },
    );
  }
  return key.trim();
}

// ---------------------------------------------------------------------------
// Lazy singleton client factory
// ---------------------------------------------------------------------------

let _clientInstance: LlamaCloud | null = null;

/**
 * Returns a cached LlamaCloud REST API client, creating it on first call.
 *
 * Do NOT call this from frontend / browser code — the API key is only
 * available in the server-side environment.
 */
export function getLlamaCloudClient(): LlamaCloud {
  if (_clientInstance) {
    return _clientInstance;
  }

  const apiKey = requireLlamaCloudApiKey();

  _clientInstance = new LlamaCloud({ apiKey });

  return _clientInstance;
}

/**
 * Clears the cached client instance.
 * Useful in tests when the environment changes between test cases.
 */
export function resetLlamaCloudClient(): void {
  _clientInstance = null;
}
