/**
 * document-intelligence-core/services/processDocument.ts
 *
 * Service entry point for the processDocument pipeline.
 * Delegates to the orchestrator — this file is the stable public-facing
 * import path used by app code.
 */

export { processDocument } from '../orchestrator.js';
export type { ProcessDocumentOptions, ProcessDocumentResult } from '../types.js';
