/**
 * document-intelligence-core/registry.ts
 *
 * Provider registry.
 *
 * Resolves which DocumentIntelligenceAdapter to use for a given request.
 * All registered providers are stored here; no other file should hold a
 * provider map.
 *
 * Current implementation uses Llama Cloud as the active working provider.
 * The architecture intentionally allows future provider replacement or
 * multi-provider support — add entries to PROVIDER_REGISTRY to extend.
 */

import type { DocumentIntelligenceAdapter } from './providers/base.js';
import type { DocumentCapability, DocumentIntelligenceProvider, ProviderCapabilityMatrix } from './types.js';
import { llamaCloudAdapter } from './providers/llamaCloud/adapter.js';
import { mockAdapter } from './providers/mock/adapter.js';
import {
  DocumentIntelligenceProviderNotFoundError,
  DocumentCapabilityNotSupportedError,
} from './errors.js';
import { getDocumentIntelligenceConfig } from './config.js';

// ---------------------------------------------------------------------------
// Registry map
// ---------------------------------------------------------------------------

/**
 * Add new provider adapters here as they become available.
 * The map key must match DocumentIntelligenceProvider.
 */
const PROVIDER_REGISTRY = new Map<DocumentIntelligenceProvider, DocumentIntelligenceAdapter>([
  ['llama-cloud', llamaCloudAdapter],
  ['mock', mockAdapter],
]);

// ---------------------------------------------------------------------------
// Resolution helpers
// ---------------------------------------------------------------------------

/**
 * Retrieve an adapter by provider name.
 * Throws `DocumentIntelligenceProviderNotFoundError` if not registered.
 */
export function getDocumentIntelligenceProvider(
  provider: DocumentIntelligenceProvider,
): DocumentIntelligenceAdapter {
  const adapter = PROVIDER_REGISTRY.get(provider);
  if (!adapter) {
    throw new DocumentIntelligenceProviderNotFoundError(provider);
  }
  return adapter;
}

/**
 * Retrieve the default provider adapter as configured by
 * `getDocumentIntelligenceConfig().defaultProvider`.
 */
export function getDefaultDocumentIntelligenceProvider(): DocumentIntelligenceAdapter {
  const config = getDocumentIntelligenceConfig();
  return getDocumentIntelligenceProvider(config.defaultProvider);
}

/**
 * Resolve a provider by optional explicit override, falling back to default.
 */
export function resolveProvider(
  override?: DocumentIntelligenceProvider,
): DocumentIntelligenceAdapter {
  return override
    ? getDocumentIntelligenceProvider(override)
    : getDefaultDocumentIntelligenceProvider();
}

/**
 * Assert that the resolved provider supports the requested capability.
 * Throws `DocumentCapabilityNotSupportedError` if it does not.
 */
export function assertCapabilitySupported(
  adapter: DocumentIntelligenceAdapter,
  capability: DocumentCapability,
): void {
  if (!adapter.supports(capability)) {
    throw new DocumentCapabilityNotSupportedError(adapter.provider, capability);
  }
}

// ---------------------------------------------------------------------------
// Capability matrix
// ---------------------------------------------------------------------------

/**
 * Returns the capability matrix for a specific provider.
 *
 * Example usage:
 *   const matrix = getProviderCapabilityMatrix("llama-cloud");
 *   console.log(matrix.capabilities); // ["parse", "classify", "extract", ...]
 */
export function getProviderCapabilityMatrix(
  provider: DocumentIntelligenceProvider,
): ProviderCapabilityMatrix {
  const adapter = PROVIDER_REGISTRY.get(provider);
  if (!adapter) {
    return { provider, capabilities: [], available: false };
  }

  const allCapabilities: DocumentCapability[] = [
    'parse',
    'classify',
    'extract',
    'split',
    'index',
    'sheets',
  ];

  const capabilities = allCapabilities.filter((cap) => adapter.supports(cap));

  // "available" means the adapter is registered; actual key/config
  // validation happens at invocation time
  return { provider, capabilities, available: true };
}

/**
 * Returns capability matrices for all registered providers.
 */
export function listAllProviderCapabilities(): ProviderCapabilityMatrix[] {
  return [...PROVIDER_REGISTRY.keys()].map(getProviderCapabilityMatrix);
}

/**
 * Register a new provider adapter at runtime.
 * Useful for plugins or test overrides.
 */
export function registerProvider(
  adapter: DocumentIntelligenceAdapter,
): void {
  PROVIDER_REGISTRY.set(adapter.provider, adapter);
}
