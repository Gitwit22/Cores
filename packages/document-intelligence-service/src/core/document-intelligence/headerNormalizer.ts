/**
 * Header Normalizer
 *
 * Maps detected column headers / labels from sign-in sheets and business cards
 * to standard application field keys using semantic matching.
 *
 * Intentionally loose — prefers preserving data over dropping it.
 */

export type StandardSigninField =
  | 'fullName'
  | 'organization'
  | 'email'
  | 'phone'
  | 'screening'
  | 'shareInfo'
  | 'date'
  | 'comments';

export type StandardCardField =
  | 'fullName'
  | 'firstName'
  | 'lastName'
  | 'company'
  | 'title'
  | 'email'
  | 'phone'
  | 'website'
  | 'address'
  | 'social';

/**
 * Mapping rules: array of [regex pattern, normalized key].
 * Order matters — first match wins.
 */
const SIGNIN_HEADER_RULES: Array<[RegExp, StandardSigninField]> = [
  [/^(full\s*name|name|attendee|participant|person|who|signee|signer)$/i, 'fullName'],
  [/^(org|organization|company|affiliation|agency|employer|group|institution)$/i, 'organization'],
  [/^(e[\s-]?mail|email\s*address|contact\s*email)$/i, 'email'],
  [/^(phone|phone\s*(number|#)|mobile|cell|telephone|tel|contact\s*phone)$/i, 'phone'],
  [/^(screen(ing|ed)?|screening\s*yes|screened\??)$/i, 'screening'],
  [/^(share\s*info|share\s*information|consent(\s*to\s*share)?|ok\s*to\s*share|sharing)$/i, 'shareInfo'],
  [/^(date|event\s*date|sign(ed)?\s*date|attendance\s*date)$/i, 'date'],
  [/^(comments?|notes?|remarks?|other|additional)$/i, 'comments'],
];

const CARD_LABEL_RULES: Array<[RegExp, StandardCardField]> = [
  [/^(full\s*name|name|contact\s*name|person\s*name|cardholder|card\s*holder)$/i, 'fullName'],
  [/^(first\s*name|given\s*name|first)$/i, 'firstName'],
  [/^(last\s*name|surname|family\s*name|last)$/i, 'lastName'],
  [/^(company|org(anization)?|employer|firm|business|corp(oration)?)$/i, 'company'],
  [/^(title|job\s*title|role|position|designation)$/i, 'title'],
  [/^(e[\s-]?mail|email\s*address)$/i, 'email'],
  [/^(phone|phone\s*(number|#)|mobile|cell|telephone|tel|fax)$/i, 'phone'],
  [/^(website|web|url|site|homepage)$/i, 'website'],
  [/^(address|location|city|street|mailing|office)$/i, 'address'],
  [/^(social|twitter|linkedin|instagram|facebook|x\.com|handle)$/i, 'social'],
];

/**
 * Normalize a single header string to a standard sign-in field, or null if unrecognized.
 */
export function normalizeSigninHeader(header: string): StandardSigninField | null {
  const trimmed = header.trim();
  for (const [pattern, key] of SIGNIN_HEADER_RULES) {
    if (pattern.test(trimmed)) return key;
  }
  return null;
}

/**
 * Normalize a single label string to a standard card field, or null if unrecognized.
 */
export function normalizeCardLabel(label: string): StandardCardField | null {
  const trimmed = label.trim();
  for (const [pattern, key] of CARD_LABEL_RULES) {
    if (pattern.test(trimmed)) return key;
  }
  return null;
}

export interface HeaderMapping {
  /** Original header text as detected */
  original: string;
  /** Normalized standard key, or null if unmapped */
  normalized: string | null;
}

/**
 * Build a mapping from detected headers to standard sign-in fields.
 */
export function buildSigninHeaderMap(headers: string[]): HeaderMapping[] {
  return headers.map((h) => ({
    original: h,
    normalized: normalizeSigninHeader(h),
  }));
}

/**
 * Build a mapping from detected labels to standard card fields.
 */
export function buildCardLabelMap(labels: string[]): HeaderMapping[] {
  return labels.map((l) => ({
    original: l,
    normalized: normalizeCardLabel(l),
  }));
}
