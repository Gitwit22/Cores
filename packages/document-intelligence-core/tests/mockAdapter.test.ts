/**
 * Tests: Mock adapter
 *
 * Verifies that the mock adapter returns correct normalized result shapes
 * for all capabilities without making any real API calls.
 */

import { mockAdapter } from '../src/providers/mock/adapter';

const testInput = {
  filePath: '/tmp/test.pdf',
  fileName: 'test.pdf',
  documentId: 'doc-123',
  jobId: 'job-456',
};

describe('mockAdapter', () => {
  it('declares provider as "mock"', () => {
    expect(mockAdapter.provider).toBe('mock');
  });

  it('supports all core capabilities', () => {
    const caps = ['parse', 'classify', 'extract', 'split', 'index'] as const;
    for (const cap of caps) {
      expect(mockAdapter.supports(cap)).toBe(true);
    }
  });

  describe('parse', () => {
    it('returns a complete NormalizedParseResult', async () => {
      const result = await mockAdapter.parse!(testInput);
      expect(result.provider).toBe('mock');
      expect(result.status).toBe('complete');
      expect(typeof result.text).toBe('string');
      expect(typeof result.markdown).toBe('string');
      expect(result.text).toContain('test.pdf');
    });
  });

  describe('classify', () => {
    it('returns a complete NormalizedClassificationResult', async () => {
      const result = await mockAdapter.classify!(testInput);
      expect(result.provider).toBe('mock');
      expect(result.status).toBe('complete');
      expect(result.documentType).toBe('general_report');
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('extract', () => {
    it('returns a NormalizedExtractionResult with mapped fields', async () => {
      const schema = {
        name: 'TestSchema',
        fields: [
          { key: 'amount', description: 'Total amount' },
          { key: 'date', description: 'Document date' },
        ],
      };
      const result = await mockAdapter.extract!(testInput, schema);
      expect(result.provider).toBe('mock');
      expect(result.status).toBe('complete');
      expect(result.fields).toHaveLength(2);
      expect(result.fields[0]?.key).toBe('amount');
      expect(result.fields[1]?.key).toBe('date');
    });

    it('returns empty fields for an empty schema', async () => {
      const result = await mockAdapter.extract!(testInput, { fields: [] });
      expect(result.fields).toHaveLength(0);
    });
  });

  describe('split', () => {
    it('returns a NormalizedSplitResult with segments', async () => {
      const result = await mockAdapter.split!(testInput);
      expect(result.provider).toBe('mock');
      expect(result.status).toBe('complete');
      expect(result.segments.length).toBeGreaterThan(0);
    });
  });

  describe('index', () => {
    it('returns a NormalizedIndexResult with indexId', async () => {
      const result = await mockAdapter.index!(testInput);
      expect(result.provider).toBe('mock');
      expect(result.status).toBe('complete');
      expect(result.indexId).toContain('doc-123');
    });
  });
});
