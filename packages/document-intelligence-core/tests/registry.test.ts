/**
 * Tests: Provider registry
 *
 * Verifies that the registry correctly resolves providers, returns capability
 * matrices, and throws typed errors for unknown providers or capabilities.
 */

import {
  getDocumentIntelligenceProvider,
  getProviderCapabilityMatrix,
  listAllProviderCapabilities,
  registerProvider,
  resolveProvider,
  assertCapabilitySupported,
} from '../src/registry';
import {
  DocumentIntelligenceProviderNotFoundError,
  DocumentCapabilityNotSupportedError,
} from '../src/errors';
import type { DocumentIntelligenceAdapter } from '../src/providers/base';

describe('registry', () => {
  describe('getDocumentIntelligenceProvider', () => {
    it('resolves the llama-cloud adapter', () => {
      const adapter = getDocumentIntelligenceProvider('llama-cloud');
      expect(adapter.provider).toBe('llama-cloud');
    });

    it('resolves the mock adapter', () => {
      const adapter = getDocumentIntelligenceProvider('mock');
      expect(adapter.provider).toBe('mock');
    });

    it('throws DocumentIntelligenceProviderNotFoundError for unknown providers', () => {
      expect(() =>
        getDocumentIntelligenceProvider('unknown' as 'llama-cloud'),
      ).toThrow(DocumentIntelligenceProviderNotFoundError);
    });
  });

  describe('resolveProvider', () => {
    it('returns the default provider when no override is given', () => {
      const adapter = resolveProvider();
      expect(adapter).toBeDefined();
      expect(adapter.provider).toBe('llama-cloud');
    });

    it('returns the requested provider when an override is given', () => {
      const adapter = resolveProvider('mock');
      expect(adapter.provider).toBe('mock');
    });
  });

  describe('assertCapabilitySupported', () => {
    it('does not throw for a supported capability', () => {
      const adapter = getDocumentIntelligenceProvider('mock');
      expect(() => assertCapabilitySupported(adapter, 'parse')).not.toThrow();
    });

    it('throws DocumentCapabilityNotSupportedError for unsupported capability', () => {
      const limitedAdapter: DocumentIntelligenceAdapter = {
        provider: 'mock',
        supports: () => false,
      };
      expect(() =>
        assertCapabilitySupported(limitedAdapter, 'parse'),
      ).toThrow(DocumentCapabilityNotSupportedError);
    });
  });

  describe('getProviderCapabilityMatrix', () => {
    it('returns capabilities for llama-cloud', () => {
      const matrix = getProviderCapabilityMatrix('llama-cloud');
      expect(matrix.provider).toBe('llama-cloud');
      expect(matrix.available).toBe(true);
      expect(matrix.capabilities).toContain('parse');
      expect(matrix.capabilities).toContain('classify');
      expect(matrix.capabilities).toContain('extract');
      expect(matrix.capabilities).toContain('split');
      expect(matrix.capabilities).toContain('index');
    });

    it('returns available: false for unregistered providers', () => {
      const matrix = getProviderCapabilityMatrix('unknown' as 'llama-cloud');
      expect(matrix.available).toBe(false);
      expect(matrix.capabilities).toHaveLength(0);
    });

    it('mock adapter supports all capabilities', () => {
      const matrix = getProviderCapabilityMatrix('mock');
      expect(matrix.available).toBe(true);
      expect(matrix.capabilities.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('listAllProviderCapabilities', () => {
    it('returns an entry for every registered provider', () => {
      const all = listAllProviderCapabilities();
      const providers = all.map((m) => m.provider);
      expect(providers).toContain('llama-cloud');
      expect(providers).toContain('mock');
    });
  });

  describe('registerProvider', () => {
    it('registers a custom adapter and makes it resolvable', () => {
      const customAdapter: DocumentIntelligenceAdapter = {
        provider: 'mock',
        supports: (cap) => cap === 'parse',
        parse() {
          return Promise.resolve({
            provider: 'mock' as const,
            status: 'complete' as const,
            text: 'custom',
            markdown: 'custom',
            confidence: null,
          });
        },
      };
      expect(() => registerProvider(customAdapter)).not.toThrow();
      const resolved = getDocumentIntelligenceProvider('mock');
      expect(resolved).toBe(customAdapter);
    });
  });
});
