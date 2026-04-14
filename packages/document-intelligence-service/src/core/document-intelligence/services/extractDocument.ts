import type {
  DocumentIntelligenceProvider,
  DocumentSourceInput,
  NormalizedExtractionResult,
} from '../types.js';
import { resolveProvider, assertCapability } from '../registry.js';
import { DocumentIntelligenceInvalidInputError } from '../errors.js';

export interface ExtractDocumentOptions {
  provider?: DocumentIntelligenceProvider;
}

export async function extractDocument(
  input: DocumentSourceInput,
  schema: unknown,
  options: ExtractDocumentOptions = {},
): Promise<NormalizedExtractionResult> {
  if (!input || !input.filePath || input.filePath.trim() === '') {
    throw new DocumentIntelligenceInvalidInputError('extractDocument requires a non-empty filePath.');
  }
  if (!schema) {
    throw new DocumentIntelligenceInvalidInputError('extractDocument requires a schema object.');
  }

  const provider = resolveProvider(options.provider);
  assertCapability(provider, 'extract');
  return provider.extract!(input, schema);
}
