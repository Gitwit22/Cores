/**
 * Tests: documentIntelligence namespace object
 *
 * Verifies the primary public API shape with the mock provider so no real
 * API calls are made. These tests confirm the namespace wiring is correct.
 */

import { documentIntelligence, configureDocumentIntelligence } from '../src/index';

// Use the mock provider for all tests in this file
beforeAll(() => {
  configureDocumentIntelligence({ defaultProvider: 'mock', dryRun: false });
});

const testInput = {
  filePath: '/tmp/test-namespace.pdf',
  fileName: 'test-namespace.pdf',
  documentId: 'ns-doc-001',
};

const testSchema = {
  name: 'NamespaceTestSchema',
  fields: [
    { key: 'total', description: 'Total amount' },
    { key: 'date', description: 'Document date' },
  ],
};

describe('documentIntelligence namespace', () => {
  it('exposes all required methods', () => {
    expect(typeof documentIntelligence.parseDocument).toBe('function');
    expect(typeof documentIntelligence.classifyDocument).toBe('function');
    expect(typeof documentIntelligence.extractDocument).toBe('function');
    expect(typeof documentIntelligence.splitDocument).toBe('function');
    expect(typeof documentIntelligence.indexDocument).toBe('function');
    expect(typeof documentIntelligence.processDocument).toBe('function');
    expect(typeof documentIntelligence.getCapabilities).toBe('function');
    expect(typeof documentIntelligence.listAllCapabilities).toBe('function');
  });

  describe('parseDocument', () => {
    it('returns a normalized parse result', async () => {
      const result = await documentIntelligence.parseDocument(testInput);
      expect(result.status).toBe('complete');
      expect(typeof result.text).toBe('string');
      expect(typeof result.markdown).toBe('string');
    });
  });

  describe('classifyDocument', () => {
    it('returns a normalized classification result', async () => {
      const result = await documentIntelligence.classifyDocument(testInput);
      expect(result.status).toBe('complete');
      expect(result.documentType).toBeTruthy();
    });
  });

  describe('extractDocument', () => {
    it('returns a normalized extraction result with fields', async () => {
      const result = await documentIntelligence.extractDocument(testInput, testSchema);
      expect(result.status).toBe('complete');
      expect(result.fields.length).toBe(2);
    });
  });

  describe('splitDocument', () => {
    it('returns a normalized split result', async () => {
      const result = await documentIntelligence.splitDocument(testInput);
      expect(result.status).toBe('complete');
      expect(Array.isArray(result.segments)).toBe(true);
    });
  });

  describe('indexDocument', () => {
    it('returns a normalized index result', async () => {
      const result = await documentIntelligence.indexDocument(testInput);
      expect(result.status).toBe('complete');
    });
  });

  describe('processDocument', () => {
    it('runs parse only by default', async () => {
      const result = await documentIntelligence.processDocument(testInput, {
        parse: true,
      });
      expect(result.parse).toBeDefined();
      expect(result.classify).toBeUndefined();
      expect(result.extract).toBeUndefined();
    });

    it('runs parse + classify when both flags are set', async () => {
      const result = await documentIntelligence.processDocument(testInput, {
        parse: true,
        classify: true,
      });
      expect(result.parse).toBeDefined();
      expect(result.classify).toBeDefined();
    });

    it('runs full pipeline when all flags set', async () => {
      const result = await documentIntelligence.processDocument(testInput, {
        parse: true,
        classify: true,
        extract: true,
        split: true,
        index: true,
        extractionSchema: testSchema,
      });
      expect(result.parse).toBeDefined();
      expect(result.classify).toBeDefined();
      expect(result.extract).toBeDefined();
      expect(result.split).toBeDefined();
      expect(result.index).toBeDefined();
    });
  });

  describe('getCapabilities', () => {
    it('returns the capability matrix for llama-cloud', () => {
      const matrix = documentIntelligence.getCapabilities('llama-cloud');
      expect(matrix.provider).toBe('llama-cloud');
      expect(matrix.available).toBe(true);
      expect(matrix.capabilities).toContain('parse');
    });

    it('returns available: false for an unknown provider', () => {
      const matrix = documentIntelligence.getCapabilities('unknown' as 'llama-cloud');
      expect(matrix.available).toBe(false);
    });
  });

  describe('listAllCapabilities', () => {
    it('returns entries for all registered providers', () => {
      const all = documentIntelligence.listAllCapabilities();
      expect(all.length).toBeGreaterThanOrEqual(2);
    });
  });
});
