import type { DocumentIntelligenceAdapter } from '../base.js';
import type {
  DocumentCapability,
  DocumentSourceInput,
  NormalizedClassificationResult,
  NormalizedExtractionResult,
  NormalizedParseResult,
} from '../../types.js';
import { llamaCloudParse } from './parse.js';
import { llamaCloudClassify } from './classify.js';
import { llamaCloudExtract } from './extract.js';

const SUPPORTED_CAPABILITIES: ReadonlySet<DocumentCapability> = new Set([
  'parse',
  'classify',
  'extract',
]);

export const llamaCloudAdapter: DocumentIntelligenceAdapter = {
  provider: 'llama-cloud',
  supports(capability: DocumentCapability): boolean {
    return SUPPORTED_CAPABILITIES.has(capability);
  },
  async parse(input: DocumentSourceInput): Promise<NormalizedParseResult> {
    return llamaCloudParse(input);
  },
  async classify(
    input: DocumentSourceInput,
    categories?: readonly string[],
  ): Promise<NormalizedClassificationResult> {
    return llamaCloudClassify(input, categories);
  },
  async extract(input: DocumentSourceInput, schema: unknown): Promise<NormalizedExtractionResult> {
    return llamaCloudExtract(input, schema);
  },
};
