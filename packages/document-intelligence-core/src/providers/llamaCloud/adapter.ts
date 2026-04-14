/**
 * document-intelligence-core/providers/llamaCloud/adapter.ts
 *
 * Llama Cloud provider adapter.
 *
 * Implements DocumentIntelligenceAdapter by wiring each capability method
 * to the corresponding Llama Cloud implementation module.
 *
 * Current implementation uses Llama Cloud as the active working provider.
 * The architecture intentionally allows future provider replacement or
 * multi-provider support — swap this adapter in registry.ts to migrate.
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
} from '../../types.js';
import { llamaCloudParse } from './parse.js';
import { llamaCloudClassify, type LlamaCloudClassifyOptions } from './classify.js';
import { llamaCloudExtract } from './extract.js';
import { llamaCloudSplit } from './split.js';
import { llamaCloudIndex } from './index-capability.js';

// ---------------------------------------------------------------------------
// Supported capabilities
// ---------------------------------------------------------------------------

const LLAMA_CLOUD_CAPABILITIES: ReadonlySet<DocumentCapability> = new Set([
  'parse',
  'classify',
  'extract',
  'split',
  'index',
]);

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

/**
 * LlamaCloudAdapter connects the service layer to the Llama Cloud
 * implementation modules. It satisfies DocumentIntelligenceAdapter and
 * is registered in registry.ts.
 */
export const llamaCloudAdapter: DocumentIntelligenceAdapter = {
  provider: 'llama-cloud',

  supports(capability: DocumentCapability): boolean {
    return LLAMA_CLOUD_CAPABILITIES.has(capability);
  },

  async parse(input: DocumentSourceInput): Promise<NormalizedParseResult> {
    return llamaCloudParse(input);
  },

  async classify(
    input: DocumentSourceInput,
    categories?: readonly string[],
  ): Promise<NormalizedClassificationResult> {
    const opts: LlamaCloudClassifyOptions = categories ? { categories } : {};
    return llamaCloudClassify(input, opts);
  },

  async extract(
    input: DocumentSourceInput,
    schema: unknown,
  ): Promise<NormalizedExtractionResult> {
    return llamaCloudExtract(input, schema);
  },

  async split(input: DocumentSourceInput): Promise<NormalizedSplitResult> {
    return llamaCloudSplit(input);
  },

  async index(input: DocumentSourceInput): Promise<NormalizedIndexResult> {
    return llamaCloudIndex(input);
  },
};
