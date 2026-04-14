/**
 * document-intelligence-core/providers/mock/adapter.ts
 *
 * Mock provider adapter for local development and unit testing.
 *
 * Returns deterministic, in-memory normalized results without making any
 * real API calls. Register via registry.ts or pass `provider: "mock"` in
 * service options to activate.
 *
 * Never ship provider: "mock" as the default in production configuration.
 */

import type { DocumentIntelligenceAdapter } from '../base.js';
import type {
  DocumentCapability,
  DocumentSourceInput,
  NormalizedClassificationResult,
  NormalizedExtractionResult,
  NormalizedIndexResult,
  NormalizedParseResult,
  NormalizedSplitResult,
  ExtractedFieldValue,
} from '../../types.js';

// ---------------------------------------------------------------------------
// Mock adapter
// ---------------------------------------------------------------------------

export const mockAdapter: DocumentIntelligenceAdapter = {
  provider: 'mock',

  supports(_capability: DocumentCapability): boolean {
    return true;
  },

  parse(input: DocumentSourceInput): Promise<NormalizedParseResult> {
    return Promise.resolve({
      provider: 'mock',
      status: 'complete',
      text: `[mock parsed text for ${input.fileName ?? input.filePath}]`,
      markdown: `## Mock Parse Result\n\nFile: ${input.fileName ?? input.filePath}`,
      confidence: 1,
      pages: [],
      tables: [],
      images: [],
      rawResult: { mock: true, input },
    });
  },

  classify(
    input: DocumentSourceInput,
    _categories?: readonly string[],
  ): Promise<NormalizedClassificationResult> {
    return Promise.resolve({
      provider: 'mock',
      status: 'complete',
      documentType: 'general_report',
      confidence: 0.9,
      reasoning: 'Mock classification — always returns general_report.',
      labels: ['general_report'],
      rawResult: { mock: true, input },
    });
  },

  extract(
    input: DocumentSourceInput,
    schema: unknown,
  ): Promise<NormalizedExtractionResult> {
    const typedSchema = schema as { fields?: Array<{ key: string }> };
    const fields: ExtractedFieldValue[] = (typedSchema.fields ?? []).map(
      (f: { key: string }) => ({
        key: f.key,
        value: `[mock value for ${f.key}]`,
        confidence: 1,
      }),
    );
    return Promise.resolve({
      provider: 'mock',
      status: 'complete',
      schemaName: null,
      fields,
      confidence: 1,
      rawResult: { mock: true, input },
    });
  },

  split(input: DocumentSourceInput): Promise<NormalizedSplitResult> {
    return Promise.resolve({
      provider: 'mock',
      status: 'complete',
      segments: [
        { index: 0, text: '[mock segment 0]' },
        { index: 1, text: '[mock segment 1]' },
      ],
      rawResult: { mock: true, input },
    });
  },

  index(input: DocumentSourceInput): Promise<NormalizedIndexResult> {
    return Promise.resolve({
      provider: 'mock',
      status: 'complete',
      indexId: `mock-index-${input.documentId ?? 'unknown'}`,
      chunksIndexed: 2,
      rawResult: { mock: true, input },
    });
  },
};
