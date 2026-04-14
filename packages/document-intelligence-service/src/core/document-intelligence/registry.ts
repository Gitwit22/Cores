import type { DocumentIntelligenceAdapter } from './providers/base.js';
import type {
  DocumentCapability,
  DocumentIntelligenceProvider,
} from './types.js';
import { llamaCloudAdapter } from './providers/llamaCloud/adapter.js';
import {
  DocumentCapabilityNotSupportedError,
  DocumentProviderNotFoundError,
} from './errors.js';
import { getDocumentIntelligenceConfig } from './config.js';

const providerRegistry = new Map<DocumentIntelligenceProvider, DocumentIntelligenceAdapter>([
  ['llama-cloud', llamaCloudAdapter],
]);

export function registerProvider(provider: DocumentIntelligenceAdapter): void {
  providerRegistry.set(provider.provider, provider);
}

export function getProvider(provider: DocumentIntelligenceProvider): DocumentIntelligenceAdapter {
  const adapter = providerRegistry.get(provider);
  if (!adapter) {
    throw new DocumentProviderNotFoundError(provider);
  }
  return adapter;
}

export function resolveProvider(
  provider?: DocumentIntelligenceProvider,
): DocumentIntelligenceAdapter {
  const config = getDocumentIntelligenceConfig();
  return getProvider(provider ?? config.provider);
}

export function assertCapability(
  adapter: DocumentIntelligenceAdapter,
  capability: DocumentCapability,
): void {
  if (!adapter.supports(capability)) {
    throw new DocumentCapabilityNotSupportedError(adapter.provider, capability);
  }
}

export function listCapabilities(): {
  provider: DocumentIntelligenceProvider;
  capabilities: DocumentCapability[];
}[] {
  const allCapabilities: DocumentCapability[] = ['parse', 'classify', 'extract'];

  return [...providerRegistry.entries()].map(([provider, adapter]) => ({
    provider,
    capabilities: allCapabilities.filter((capability) => adapter.supports(capability)),
  }));
}
