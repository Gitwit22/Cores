import type {
  DocumentIntelligenceProvider,
  DocumentSourceInput,
  NormalizedClassificationResult,
} from '../types.js';
import { resolveProvider, assertCapability } from '../registry.js';
import { DocumentIntelligenceInvalidInputError } from '../errors.js';

export interface ClassifyDocumentOptions {
  provider?: DocumentIntelligenceProvider;
  categories?: string[];
}

export async function classifyDocument(
  input: DocumentSourceInput,
  options: ClassifyDocumentOptions = {},
): Promise<NormalizedClassificationResult> {
  if (!input || !input.filePath || input.filePath.trim() === '') {
    throw new DocumentIntelligenceInvalidInputError(
      'classifyDocument requires a non-empty filePath.',
    );
  }

  const provider = resolveProvider(options.provider);
  assertCapability(provider, 'classify');
  return provider.classify!(input, options.categories);
}
