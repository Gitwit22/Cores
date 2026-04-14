import type {
  DocumentCapability,
  DocumentIntelligenceProvider,
  DocumentSourceInput,
  NormalizedClassificationResult,
  NormalizedExtractionResult,
  NormalizedParseResult,
} from '../types.js';

export interface DocumentIntelligenceAdapter {
  readonly provider: DocumentIntelligenceProvider;
  supports(capability: DocumentCapability): boolean;
  parse?(input: DocumentSourceInput): Promise<NormalizedParseResult>;
  classify?(
    input: DocumentSourceInput,
    categories?: readonly string[],
  ): Promise<NormalizedClassificationResult>;
  extract?(input: DocumentSourceInput, schema: unknown): Promise<NormalizedExtractionResult>;
}
