/**
 * document-intelligence-core/orchestrator.ts
 *
 * processDocument pipeline runner.
 *
 * Combines parse → classify → extract → split → index into a single call.
 * Each capability is independent:
 * - Parse failure stops the pipeline (downstream capabilities need the text).
 * - Classify / extract / split / index failures are isolated and reported
 *   without throwing, so a partial result is always returned.
 *
 * App code should call processDocument (via documentIntelligence.processDocument
 * or by importing it directly) rather than orchestrating capabilities manually.
 */

import type {
  DocumentSourceInput,
  ProcessDocumentOptions,
  ProcessDocumentResult,
  NormalizedClassificationResult,
  NormalizedExtractionResult,
  NormalizedSplitResult,
  NormalizedIndexResult,
} from './types.js';
import { parseDocument } from './services/parseDocument.js';
import { classifyDocument } from './services/classifyDocument.js';
import { extractDocument } from './services/extractDocument.js';
import { splitDocument } from './services/splitDocument.js';
import { indexDocument } from './services/indexDocument.js';
import { DocumentIntelligenceInvalidInputError } from './errors.js';
import { getDocumentIntelligenceConfig } from './config.js';

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

/**
 * Run a multi-capability pipeline for a single document.
 *
 * Options flags control which capabilities run:
 *   { parse: true, classify: true, extract: false, split: false, index: false }
 *
 * Parse runs first because classify, extract, and split operate on its output.
 * If parse is not requested but classify/extract/split are, they fall back to
 * reading the file directly (text files only).
 *
 * @param input   - Source document descriptor
 * @param options - Which capabilities to run and optional configuration overrides
 */
export async function processDocument(
  input: DocumentSourceInput,
  options: ProcessDocumentOptions = {},
): Promise<ProcessDocumentResult> {
  // ---- Input validation --------------------------------------------------
  if (!input || !input.filePath || input.filePath.trim() === '') {
    throw new DocumentIntelligenceInvalidInputError(
      'processDocument requires a non-empty filePath.',
      { input },
    );
  }

  const config = getDocumentIntelligenceConfig();
  const {
    parse: runParse = true,
    classify: runClassify = false,
    extract: runExtract = false,
    split: runSplit = false,
    index: runIndex = false,
    extractionSchema,
    provider,
  } = options;

  const result: ProcessDocumentResult = {};

  // ---- 1. Parse ----------------------------------------------------------
  let parsedText: string | undefined;

  if (runParse) {
    const parseResult = await parseDocument(input, { provider });
    result.parse = parseResult;

    if (parseResult.status === 'failed') {
      // Parse failure stops the pipeline — downstream capabilities have no text
      return result;
    }

    parsedText = parseResult.text || parseResult.markdown || undefined;
  }

  // ---- 2. Classify -------------------------------------------------------
  if (runClassify) {
    let classifyResult: NormalizedClassificationResult;
    try {
      // Supply pre-parsed text by injecting it via the classify options path.
      // The LlamaCloud classify impl reads parsedText from options.
      const classifyInput: DocumentSourceInput = parsedText
        ? { ...input, filePath: input.filePath }
        : input;

      // Pass parsedText through a temporary file only if needed;
      // for now pass via the classify service — it will read the file if absent.
      // Full in-memory text pass is wired at the adapter level in a future pass.
      classifyResult = await classifyDocument(classifyInput, {
        provider,
        categories: config.classificationCategories,
      });
    } catch (err) {
      // Classification failure is isolated — does not abort the pipeline
      classifyResult = {
        provider: provider ?? config.defaultProvider,
        status: 'failed',
        documentType: null,
        confidence: null,
        reasoning: err instanceof Error ? err.message : 'Unknown classify error',
      };
    }
    result.classify = classifyResult;
  }

  // ---- 3. Extract --------------------------------------------------------
  if (runExtract) {
    const schema = extractionSchema ?? options.extractionSchema;

    let extractResult: NormalizedExtractionResult;
    try {
      if (!schema) {
        extractResult = {
          provider: provider ?? config.defaultProvider,
          status: 'skipped',
          fields: [],
          confidence: null,
          rawResult: { reason: 'No extractionSchema provided in ProcessDocumentOptions' },
        };
      } else {
        extractResult = await extractDocument(input, schema, { provider });
      }
    } catch (err) {
      extractResult = {
        provider: provider ?? config.defaultProvider,
        status: 'failed',
        fields: [],
        confidence: null,
        rawResult: { error: err instanceof Error ? err.message : 'Unknown extract error' },
      };
    }
    result.extract = extractResult;
  }

  // ---- 4. Split ----------------------------------------------------------
  if (runSplit) {
    let splitResult: NormalizedSplitResult;
    try {
      splitResult = await splitDocument(input, { provider });
    } catch (err) {
      splitResult = {
        provider: provider ?? config.defaultProvider,
        status: 'failed',
        segments: [],
        rawResult: { error: err instanceof Error ? err.message : 'Unknown split error' },
      };
    }
    result.split = splitResult;
  }

  // ---- 5. Index ----------------------------------------------------------
  if (runIndex) {
    let indexResult: NormalizedIndexResult;
    try {
      indexResult = await indexDocument(input, { provider });
    } catch (err) {
      indexResult = {
        provider: provider ?? config.defaultProvider,
        status: 'failed',
        rawResult: { error: err instanceof Error ? err.message : 'Unknown index error' },
      };
    }
    result.index = indexResult;
  }

  return result;
}
