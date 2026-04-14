/**
 * document-intelligence-core/providers/llamaCloud/classify.ts
 *
 * Llama Cloud classify capability implementation.
 *
 * Classification is performed by parsing the document (or accepting
 * pre-parsed text) and then applying keyword/pattern scoring against a
 * configurable category list. The category list defaults to Chronicle's
 * starter set but any caller may supply a custom list, keeping this
 * logic reusable across programs.
 */

import type { NormalizedClassificationResult, DocumentSourceInput } from '../../types.js';
import { DocumentIntelligenceInvalidInputError } from '../../errors.js';
import { normalizeClassificationResult } from '../../normalizers/classifyNormalizer.js';
import { CHRONICLE_DEFAULT_CATEGORIES } from '../../config.js';

// ---------------------------------------------------------------------------
// Category rules
// ---------------------------------------------------------------------------

/**
 * Lightweight keyword rules used for scoring.
 * Each entry maps a category label to an array of keyword signals.
 *
 * This is intentionally simple — not a full ML model. It provides a useful
 * baseline and can be replaced with a proper LLM prompt in a future pass.
 */
const CATEGORY_KEYWORD_RULES: Record<string, string[]> = {
  irs_notice: ['internal revenue service', 'irs', 'tax notice', '1040', 'cp2000', 'cp501', 'cp503', 'notice of deficiency', 'federal tax'],
  bank_receipt: ['account number', 'routing number', 'bank', 'transaction', 'deposit', 'withdrawal', 'balance', 'statement'],
  invoice: ['invoice', 'bill to', 'due date', 'payment due', 'total amount due', 'invoice number', 'net 30', 'net 60'],
  meeting_minutes: ['minutes of the meeting', 'attendees', 'quorum', 'motion', 'seconded', 'adjourned', 'agenda item'],
  board_governance: ['board of directors', 'resolution', 'bylaws', 'governance', 'articles of incorporation', 'fiduciary', 'trustee'],
  grant_document: ['grant award', 'grant agreement', 'funding opportunity', 'grantee', 'federal award', 'cfda', 'program narrative'],
  contract: ['agreement', 'parties', 'terms and conditions', 'whereas', 'in consideration of', 'obligations', 'termination clause'],
  newsletter: ['newsletter', 'upcoming events', 'announcements', 'community update', 'subscribe', 'unsubscribe', 'edition'],
  general_report: ['executive summary', 'findings', 'recommendations', 'data analysis', 'conclusion', 'prepared by', 'fiscal year'],
};

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------

interface CategoryScore {
  category: string;
  score: number;
  matchedKeywords: string[];
}

function scoreCategories(
  text: string,
  categories: readonly string[],
): CategoryScore[] {
  const normalized = text.toLowerCase();
  return categories.map((category) => {
    const rules = CATEGORY_KEYWORD_RULES[category] ?? [];
    const matchedKeywords: string[] = [];
    for (const kw of rules) {
      if (normalized.includes(kw.toLowerCase())) {
        matchedKeywords.push(kw);
      }
    }
    const score = rules.length > 0 ? matchedKeywords.length / rules.length : 0;
    return { category, score, matchedKeywords };
  });
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Options for the classify call. Callers may supply pre-parsed text to
 * avoid a redundant parse API call.
 */
export interface LlamaCloudClassifyOptions {
  /** Pre-parsed text content. If provided, no parse call is made. */
  parsedText?: string;
  /** Override the category list. Defaults to CHRONICLE_DEFAULT_CATEGORIES. */
  categories?: readonly string[];
  /** Minimum confidence to assign a non-uncategorized label */
  confidenceThreshold?: number;
}

/**
 * Classify a document using keyword scoring against a configurable
 * category list.
 *
 * When `parsedText` is supplied the document is not re-parsed. When it
 * is absent, `input.filePath` must point to an already-readable text/
 * markdown file (raw text path — not a PDF; parse first for binaries).
 */
export async function llamaCloudClassify(
  input: DocumentSourceInput,
  options: LlamaCloudClassifyOptions = {},
): Promise<NormalizedClassificationResult> {
  const {
    parsedText,
    categories = CHRONICLE_DEFAULT_CATEGORIES,
    confidenceThreshold = 0.15,
  } = options;

  // ---- Resolve text to classify ------------------------------------------
  let textToClassify = parsedText;

  if (!textToClassify) {
    const { filePath } = input;
    if (!filePath || filePath.trim() === '') {
      throw new DocumentIntelligenceInvalidInputError(
        'Either parsedText or a valid filePath is required for classify.',
        { input },
      );
    }

    // Attempt to read as plain text (callers should parse binaries first)
    try {
      const { readFileSync } = await import('node:fs');
      textToClassify = readFileSync(filePath, 'utf-8');
    } catch (err) {
      throw new DocumentIntelligenceInvalidInputError(
        `Could not read file for classification: ${filePath}`,
        { filePath, cause: err },
      );
    }
  }

  // ---- Score categories --------------------------------------------------
  const scores = scoreCategories(textToClassify, categories);
  scores.sort((a, b) => b.score - a.score);

  const top = scores[0];
  const hasConfidence = top && top.score >= confidenceThreshold;

  const documentType = hasConfidence ? (top?.category ?? 'uncategorized') : 'uncategorized';
  const confidence = top ? Math.min(top.score * 2, 1) : 0; // scale [0–0.5] → [0–1]
  const reasoning = hasConfidence && top
    ? `Matched keywords: ${top.matchedKeywords.join(', ')}`
    : 'No strong keyword signals found; defaulting to uncategorized.';
  const labels = scores.filter((s) => s.score > 0).map((s) => s.category);

  const rawResult = { scores, threshold: confidenceThreshold };

  return normalizeClassificationResult({
    documentType,
    confidence,
    reasoning,
    labels,
    rawResult,
    status: 'complete',
  });
}
