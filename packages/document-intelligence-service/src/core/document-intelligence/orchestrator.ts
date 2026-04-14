import type {
  DocumentSourceInput,
  ProcessDocumentOptions,
  ProcessDocumentResult,
} from './types.js';
import { parseDocument } from './services/parseDocument.js';
import { classifyDocument } from './services/classifyDocument.js';
import { extractDocument } from './services/extractDocument.js';
import { DocumentIntelligenceInvalidInputError } from './errors.js';

export async function processDocument(
  input: DocumentSourceInput,
  options: ProcessDocumentOptions = {},
): Promise<ProcessDocumentResult> {
  if (!input || !input.filePath || input.filePath.trim() === '') {
    throw new DocumentIntelligenceInvalidInputError('processDocument requires a non-empty filePath.');
  }

  const runParse = options.parse ?? true;
  const runClassify = options.classify ?? false;
  const runExtract = options.extract ?? false;

  const result: ProcessDocumentResult = {};

  if (runParse) {
    result.parse = await parseDocument(input, { provider: options.provider });
    if (result.parse.status === 'failed') {
      return result;
    }
  }

  if (runClassify) {
    result.classify = await classifyDocument(input, {
      provider: options.provider,
      categories: options.categories,
    });
  }

  if (runExtract) {
    result.extract = await extractDocument(input, options.schema, {
      provider: options.provider,
    });
  }

  return result;
}
