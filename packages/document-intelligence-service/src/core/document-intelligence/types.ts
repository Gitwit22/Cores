export type DocumentIntelligenceProvider = 'llama-cloud';

export type DocumentCapability = 'parse' | 'classify' | 'extract';

export interface DocumentSourceInput {
  filePath: string;
  fileName?: string;
  mimeType?: string;
}

export interface NormalizedParseResult {
  provider: DocumentIntelligenceProvider;
  status: 'complete' | 'failed';
  text: string;
  markdown: string;
  confidence: number | null;
  pages?: unknown[];
  tables?: unknown[];
}

export interface NormalizedClassificationResult {
  provider: DocumentIntelligenceProvider;
  status: 'complete' | 'failed' | 'skipped';
  documentType: string | null;
  confidence: number | null;
  reasoning: string | null;
  labels?: string[];
}

export interface ExtractedFieldValue {
  key: string;
  value: unknown;
  confidence?: number | null;
}

export interface NormalizedExtractionResult {
  provider: DocumentIntelligenceProvider;
  status: 'complete' | 'failed' | 'skipped';
  fields: ExtractedFieldValue[];
  confidence: number | null;
}

export interface ProcessDocumentOptions {
  parse?: boolean;
  classify?: boolean;
  extract?: boolean;
  schema?: unknown;
  categories?: string[];
  provider?: DocumentIntelligenceProvider;
}

export interface ProcessDocumentResult {
  parse?: NormalizedParseResult;
  classify?: NormalizedClassificationResult;
  extract?: NormalizedExtractionResult;
}
