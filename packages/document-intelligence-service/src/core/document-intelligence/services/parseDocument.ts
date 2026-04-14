import type {
  DocumentIntelligenceProvider,
  DocumentSourceInput,
  NormalizedParseResult,
} from '../types.js';
import { resolveProvider, assertCapability } from '../registry.js';
import { DocumentIntelligenceInvalidInputError } from '../errors.js';

export interface ParseDocumentOptions {
  provider?: DocumentIntelligenceProvider;
}

export async function parseDocument(
  input: DocumentSourceInput,
  options: ParseDocumentOptions = {},
): Promise<NormalizedParseResult> {
  if (!input || !input.filePath || input.filePath.trim() === '') {
    throw new DocumentIntelligenceInvalidInputError('parseDocument requires a non-empty filePath.');
  }

  const provider = resolveProvider(options.provider);
  assertCapability(provider, 'parse');
  return provider.parse!(input);
}
