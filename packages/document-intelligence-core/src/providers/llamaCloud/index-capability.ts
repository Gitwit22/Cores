/**
 * document-intelligence-core/providers/llamaCloud/index-capability.ts
 *
 * Llama Cloud index capability — scaffolded.
 *
 * Indexes a parsed document for later semantic retrieval via LlamaCloudIndex.
 * The implementation uses the centralized client from client.ts.
 *
 * TODO: Wire full upsert/retrieval flow once retrieval use cases are defined.
 */

import type { NormalizedIndexResult, DocumentSourceInput } from '../../types.js';
import { DocumentIntelligenceProviderError } from '../../errors.js';
import { getLlamaCloudClient } from './client.js';
import { normalizeIndexResult } from '../../normalizers/indexNormalizer.js';

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Index a document with Llama Cloud for later semantic retrieval.
 *
 * `parsedText` should be supplied when the document has already been parsed
 * to avoid a redundant API call.
 */
export function llamaCloudIndex(
  input: DocumentSourceInput,
  parsedText?: string,
): Promise<NormalizedIndexResult> {
  const { documentId, fileName } = input;

  try {
    // Ensure the client can be instantiated (validates API key)
    const client = getLlamaCloudClient();
    void client; // will be used in the full upsert implementation

    // TODO: Implement upsert when the LlamaCloudIndex insertion API is
    // stabilised. For now we scaffold the normalized return shape so the
    // service layer and orchestrator compile and callers have a stable
    // contract to code against.
    void parsedText; // will be used in the full implementation

    return Promise.resolve(normalizeIndexResult({
      indexId: documentId ?? null,
      chunksIndexed: null,
      rawResult: {
        note: 'Index capability scaffolded — full upsert not yet implemented.',
        fileName,
        documentId,
      },
      status: 'skipped',
    }));
  } catch (err) {
    if (err instanceof Error && err.name.startsWith('DocumentIntelligence')) {
      return Promise.reject(err);
    }
    return Promise.reject(new DocumentIntelligenceProviderError(
      'llama-cloud',
      err instanceof Error ? err.message : 'Unknown index error',
      { input, cause: err },
    ));
  }
}
