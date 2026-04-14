/**
 * Tests: Result normalizers
 *
 * Verifies that each normalizer maps raw provider input into the correct
 * normalized output shape without leaking provider-specific fields.
 */

import { normalizeParseResult } from '../src/normalizers/parseNormalizer';
import { normalizeClassificationResult } from '../src/normalizers/classifyNormalizer';
import { normalizeExtractionResult } from '../src/normalizers/extractNormalizer';
import { normalizeSplitResult } from '../src/normalizers/splitNormalizer';
import { normalizeIndexResult } from '../src/normalizers/indexNormalizer';

// ---------------------------------------------------------------------------
// parseNormalizer
// ---------------------------------------------------------------------------

describe('normalizeParseResult', () => {
  it('extracts markdown from ParsingGetResponse pages', () => {
    const raw = {
      job: { status: 'SUCCESS', id: 'pjb-001' },
      markdown: {
        pages: [
          { markdown: '# Hello\n\nWorld', page_number: 1 },
        ],
      },
    };
    const result = normalizeParseResult(raw, 'test.pdf');

    expect(result.provider).toBe('llama-cloud');
    expect(result.status).toBe('complete');
    expect(result.markdown).toContain('Hello');
    expect(result.text).toContain('Hello');
    // markdown heading syntax stripped from plain text
    expect(result.text).not.toContain('#');
  });

  it('returns failed status when job status is ERROR', () => {
    const raw = { job: { status: 'ERROR' }, markdown: null };
    const result = normalizeParseResult(raw, 'empty.pdf');
    expect(result.status).toBe('failed');
  });

  it('returns failed status for empty response', () => {
    const result = normalizeParseResult({}, 'empty.pdf');
    expect(result.status).toBe('failed');
    expect(result.text).toBe('');
    expect(result.markdown).toBe('');
  });

  it('concatenates multiple pages', () => {
    const raw = {
      job: { status: 'SUCCESS' },
      markdown: {
        pages: [
          { markdown: 'Page one content', page_number: 1 },
          { markdown: 'Page two content', page_number: 2 },
        ],
      },
    };
    const result = normalizeParseResult(raw);
    expect(result.markdown).toContain('Page one content');
    expect(result.markdown).toContain('Page two content');
  });

  it('includes rawResult for audit', () => {
    const raw = { job: { status: 'SUCCESS' }, markdown: { pages: [] } };
    const result = normalizeParseResult(raw);
    expect(result.rawResult).toBe(raw);
  });
});

// ---------------------------------------------------------------------------
// classifyNormalizer
// ---------------------------------------------------------------------------

describe('normalizeClassificationResult', () => {
  it('clamps confidence to [0, 1]', () => {
    const result = normalizeClassificationResult({
      documentType: 'invoice',
      confidence: 1.5,
      reasoning: 'test',
      status: 'complete',
    });
    expect(result.confidence).toBe(1);
  });

  it('preserves null confidence', () => {
    const result = normalizeClassificationResult({
      documentType: null,
      confidence: null,
      reasoning: null,
      status: 'failed',
    });
    expect(result.confidence).toBeNull();
  });

  it('sets provider to llama-cloud', () => {
    const result = normalizeClassificationResult({
      documentType: 'invoice',
      confidence: 0.8,
      reasoning: 'keywords matched',
      status: 'complete',
    });
    expect(result.provider).toBe('llama-cloud');
  });
});

// ---------------------------------------------------------------------------
// extractNormalizer
// ---------------------------------------------------------------------------

describe('normalizeExtractionResult', () => {
  it('maps fields and clamps confidence', () => {
    const result = normalizeExtractionResult({
      schemaName: 'invoice',
      fields: [{ key: 'total', value: '$100', confidence: 0.9 }],
      confidence: 0.85,
      status: 'complete',
    });

    expect(result.provider).toBe('llama-cloud');
    expect(result.fields).toHaveLength(1);
    expect(result.fields[0]?.key).toBe('total');
    expect(result.confidence).toBeCloseTo(0.85);
  });

  it('handles empty fields array', () => {
    const result = normalizeExtractionResult({
      fields: [],
      confidence: null,
      status: 'skipped',
    });
    expect(result.fields).toHaveLength(0);
    expect(result.confidence).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// splitNormalizer
// ---------------------------------------------------------------------------

describe('normalizeSplitResult', () => {
  it('maps segments correctly', () => {
    const result = normalizeSplitResult({
      segments: [
        { index: 0, text: 'First paragraph' },
        { index: 1, text: 'Second paragraph' },
      ],
    });

    expect(result.provider).toBe('llama-cloud');
    expect(result.status).toBe('complete');
    expect(result.segments).toHaveLength(2);
    expect(result.segments[0]?.text).toBe('First paragraph');
  });
});

// ---------------------------------------------------------------------------
// indexNormalizer
// ---------------------------------------------------------------------------

describe('normalizeIndexResult', () => {
  it('maps indexId and chunksIndexed', () => {
    const result = normalizeIndexResult({
      indexId: 'idx-123',
      chunksIndexed: 10,
      status: 'complete',
    });

    expect(result.provider).toBe('llama-cloud');
    expect(result.indexId).toBe('idx-123');
    expect(result.chunksIndexed).toBe(10);
  });

  it('defaults missing values to null', () => {
    const result = normalizeIndexResult({});
    expect(result.indexId).toBeNull();
    expect(result.chunksIndexed).toBeNull();
    expect(result.status).toBe('complete');
  });
});
