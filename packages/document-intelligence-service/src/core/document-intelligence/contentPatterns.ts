/**
 * Content Pattern Detector
 *
 * Infers field semantics from cell/value content when headers are missing
 * or ambiguous. Used by business card extraction and as a fallback for
 * sign-in sheets with unlabeled columns.
 */

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_RE = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
const URL_RE = /(?:https?:\/\/|www\.)[a-z0-9.-]+\.[a-z]{2,}(?:\/\S*)?/i;
const SOCIAL_RE = /@[a-z0-9._]{1,30}\b/i;
const DATE_RE = /\b(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}|\w+\s+\d{1,2},?\s+\d{4})\b/i;

export type InferredType =
  | 'email'
  | 'phone'
  | 'website'
  | 'social'
  | 'date'
  | 'address'
  | 'unknown';

interface ContentInference {
  type: InferredType;
  value: string;
  /** Extracted match (may differ from full value, e.g. email within a line) */
  match: string;
}

/**
 * Infer the likely semantic type of a content value.
 * Returns all detected types — a single value may contain multiple signals.
 */
export function inferContentTypes(value: string): ContentInference[] {
  const results: ContentInference[] = [];
  const trimmed = value.trim();
  if (!trimmed) return results;

  const emailMatch = EMAIL_RE.exec(trimmed);
  if (emailMatch) {
    results.push({ type: 'email', value: trimmed, match: emailMatch[0] });
  }

  const phoneMatch = PHONE_RE.exec(trimmed);
  if (phoneMatch) {
    results.push({ type: 'phone', value: trimmed, match: phoneMatch[0] });
  }

  const urlMatch = URL_RE.exec(trimmed);
  if (urlMatch) {
    results.push({ type: 'website', value: trimmed, match: urlMatch[0] });
  }

  // Only flag social if no email (@ in emails shouldn't match)
  if (!emailMatch) {
    const socialMatch = SOCIAL_RE.exec(trimmed);
    if (socialMatch) {
      results.push({ type: 'social', value: trimmed, match: socialMatch[0] });
    }
  }

  const dateMatch = DATE_RE.exec(trimmed);
  if (dateMatch) {
    results.push({ type: 'date', value: trimmed, match: dateMatch[0] });
  }

  // Address heuristic: contains digits + common address tokens
  if (/\d+/.test(trimmed) && /\b(st|street|ave|avenue|blvd|dr|drive|rd|road|ln|lane|way|ct|suite|ste|floor|fl|apt)\b/i.test(trimmed)) {
    results.push({ type: 'address', value: trimmed, match: trimmed });
  }

  return results;
}

/**
 * Extract all emails from a block of text.
 */
export function extractEmails(text: string): string[] {
  const matches = text.match(new RegExp(EMAIL_RE.source, 'gi'));
  return matches ?? [];
}

/**
 * Extract all phone numbers from a block of text.
 */
export function extractPhones(text: string): string[] {
  const matches = text.match(new RegExp(PHONE_RE.source, 'g'));
  return matches ?? [];
}

/**
 * Extract all URLs from a block of text.
 */
export function extractUrls(text: string): string[] {
  const matches = text.match(new RegExp(URL_RE.source, 'gi'));
  return matches ?? [];
}
