import type {
  DocumentSourceInput,
  NormalizedClassificationResult,
} from '../../types.js';
import { DocumentIntelligenceInvalidInputError } from '../../errors.js';
import { normalizeClassificationResult } from '../../normalizers/classifyNormalizer.js';
import { llamaCloudParse } from './parse.js';

const DEFAULT_CATEGORIES: readonly string[] = [
  'invoice',
  'irs_notice',
  'sign_in_sheet',
  'bank_receipt',
  'general_report',
  'uncategorized',
];

const CATEGORY_KEYWORDS: Record<string, readonly string[]> = {
  invoice: ['invoice', 'bill to', 'amount due', 'invoice number', 'net 30'],
  irs_notice: ['internal revenue service', 'irs', 'cp2000', 'notice', 'tax'],
  sign_in_sheet: ['sign in', 'attendance', 'participant', 'phone', 'email'],
  bank_receipt: ['account number', 'routing number', 'deposit', 'withdrawal', 'statement'],
  general_report: ['summary', 'findings', 'recommendations', 'report'],
  uncategorized: [],
};

export async function llamaCloudClassify(
  input: DocumentSourceInput,
  categories?: readonly string[],
): Promise<NormalizedClassificationResult> {
  const parseResult = await llamaCloudParse(input);
  if (parseResult.status !== 'complete' || parseResult.text.trim() === '') {
    throw new DocumentIntelligenceInvalidInputError('Document text is required for classification.');
  }

  const selectedCategories = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;
  const content = parseResult.text.toLowerCase();
  const scored = selectedCategories.map((category) => {
    const keywords = CATEGORY_KEYWORDS[category] ?? [];
    const matches = keywords.filter((keyword) => content.includes(keyword.toLowerCase()));
    const score = keywords.length > 0 ? matches.length / keywords.length : 0;
    return { category, matches, score };
  });
  scored.sort((left, right) => right.score - left.score);

  const top = scored[0];
  const confidence = top ? Math.min(top.score * 2, 1) : 0;
  const hasTopMatch = top && top.score > 0;

  return normalizeClassificationResult({
    status: 'complete',
    documentType: hasTopMatch ? top.category : 'uncategorized',
    confidence,
    reasoning: hasTopMatch
      ? `Matched keywords: ${top.matches.join(', ')}`
      : 'No category keyword matches found.',
    labels: scored.filter((item) => item.score > 0).map((item) => item.category),
  });
}
