/**
 * Dynamic Extraction Service
 *
 * Structure-first pipeline that detects document layout, extracts content
 * dynamically, normalizes known fields, and preserves extra/unknown fields.
 *
 * Replaces the hardcoded schema-dependent extraction for sign-in sheets
 * and business cards.
 */

import type { NormalizedParseResult } from './types.js';
import { analyzeStructure, type StructureAnalysis } from './structureAnalyzer.js';
import {
  buildSigninHeaderMap,
  buildCardLabelMap,
  type HeaderMapping,
} from './headerNormalizer.js';
import {
  inferContentTypes,
  extractEmails,
  extractPhones,
  extractUrls,
} from './contentPatterns.js';

// ── Response types ─────────────────────────────────────────────────────────────

export interface NormalizedSigninRow {
  id: string;
  fullName: string;
  organization: string;
  email: string;
  phone: string;
  screening: string;
  shareInfo: string;
  date: string;
  comments: string;
  extraFields: Record<string, string>;
  [key: string]: string | Record<string, string>;
}

export interface SigninExtractionResult {
  status: 'complete' | 'failed';
  structure: 'table' | 'single-entity' | 'unstructured';
  detectedHeaders: string[];
  headerMapping: HeaderMapping[];
  normalizedRows: NormalizedSigninRow[];
  rawRows: Array<Record<string, string>>;
  confidence: number;
}

export interface NormalizedCard {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  company: string;
  title: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  social: string;
  extraFields: Record<string, string>;
  rawText: string;
  [key: string]: string | Record<string, string>;
}

export interface CardExtractionResult {
  status: 'complete' | 'failed';
  structure: 'table' | 'single-entity' | 'unstructured';
  detectedHeaders: string[];
  headerMapping: HeaderMapping[];
  card: NormalizedCard;
  confidence: number;
}

const SIGNIN_HEADER_ALIASES: Record<string, string[]> = {
  fullName: ['full name', 'name', 'attendee', 'participant', 'person', 'contact'],
  organization: ['organization', 'org', 'company', 'affiliation', 'agency', 'employer', 'group', 'institution'],
  email: ['email', 'e-mail', 'email address', 'contact email'],
  phone: ['phone', 'phone number', 'mobile', 'cell', 'telephone', 'tel'],
  screening: ['screening', 'screened', 'waiver', 'agree', 'consent'],
  shareInfo: ['share info', 'share information', 'share', 'sharing', 'opt in', 'newsletter'],
  date: ['date', 'event date', 'sign date', 'signed date', 'attendance date'],
  comments: ['comments', 'comment', 'notes', 'note', 'remarks', 'other', 'additional'],
};

const CONTACT_TOKEN_RE = /(?:https?:\/\/|www\.|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/i;
const CONTACT_TOKEN_GLOBAL_RE = new RegExp(CONTACT_TOKEN_RE.source, 'gi');
const COMMON_ORG_WORD_RE = /\b(organization|org|company|corp|corporation|inc|llc|group|team|church|ministry|alliance|coalition|network|foundation|association|committee|institute|academy|school|university|college|agency|department|dept|office|center|centre|community|partners?)\b/i;
const NOISE_NAME_WORD_RE = /\b(screening|share|date|comment|comments|phone|email|name|organization|org|entry|participant|attendee|signature|signed)\b/i;
const SERVICE_LINE_TOKEN_RE = /\b(water|fire|theft|wind|mold|flood|storm|restoration|mitigation|cleanup|repair|services?)\b/i;
const TITLE_HINT_RE = /\b(adjuster|manager|director|officer|consultant|specialist|analyst|broker|agent|representative|engineer|attorney|lawyer|owner|founder|president|vice\s+president|vp|supervisor|coordinator|administrator)\b/i;
const LOGO_OF_RE = /logo\s+of\s+(.+?)(?:\s+(?:featuring|with|showing)\b|$)/i;
const DEBUG_NAME_ORG_INFERENCE = process.env.DOC_INTEL_DEBUG_NAME_ORG === 'true';

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function splitPersonName(fullName: string): { fullName: string; firstName: string; lastName: string } {
  const normalized = normalizeWhitespace(fullName);
  if (!normalized) {
    return { fullName: '', firstName: '', lastName: '' };
  }

  const commaMatch = /^([^,]+),\s*(.+)$/.exec(normalized);
  if (commaMatch) {
    const lastName = normalizeWhitespace(commaMatch[1]);
    const firstName = normalizeWhitespace(commaMatch[2]);
    return {
      fullName: `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
    };
  }

  const parts = normalized.split(' ').filter(Boolean);
  if (parts.length === 1) {
    return { fullName: normalized, firstName: parts[0], lastName: '' };
  }

  return {
    fullName: normalized,
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
}

function syncCardNameFields(card: NormalizedCard): void {
  const splitFromFullName = splitPersonName(card.fullName);

  if (!card.fullName && (card.firstName || card.lastName)) {
    card.fullName = normalizeWhitespace([card.firstName, card.lastName].filter(Boolean).join(' '));
  }

  if (card.fullName) {
    if (!card.firstName) {
      card.firstName = splitFromFullName.firstName;
    }
    if (!card.lastName) {
      card.lastName = splitFromFullName.lastName;
    }
    card.fullName = splitFromFullName.fullName;
    return;
  }

  if (card.firstName || card.lastName) {
    card.fullName = normalizeWhitespace([card.firstName, card.lastName].filter(Boolean).join(' '));
  }
}

function hasContactToken(value: string): boolean {
  return CONTACT_TOKEN_RE.test(value);
}

function isLikelyPersonName(value: string): boolean {
  const trimmed = normalizeWhitespace(value);
  if (!trimmed) return false;
  if (trimmed.length < 3 || trimmed.length > 60) return false;
  if (/[0-9]/.test(trimmed) || hasContactToken(trimmed)) return false;
  if (NOISE_NAME_WORD_RE.test(trimmed)) return false;

  const tokens = trimmed.split(' ').filter(Boolean);
  if (tokens.length < 2 || tokens.length > 5) return false;

  // Accept standard proper-name tokens and short initial-like tokens.
  const validTokenCount = tokens.filter(
    (token) => /^[A-Za-z][A-Za-z'\-.]+$/.test(token) || /^[A-Z]{1,2}\.?$/.test(token),
  ).length;
  return validTokenCount >= Math.max(2, tokens.length - 1);
}

function extractLikelyNameFromFragment(value: string): string {
  const trimmed = normalizeWhitespace(value);
  if (!trimmed) return '';

  // Remove trailing acronym chains like "VAAC/MLCV/NAACP".
  const withoutOrgChain = normalizeWhitespace(
    trimmed.replace(/\b([A-Z]{2,8})(?:\s*\/\s*[A-Z]{2,8})+\b/g, ' '),
  );
  const stripped = normalizeWhitespace(withoutOrgChain.replace(/[|,;:/]+/g, ' '));
  const tokens = stripped.split(' ').filter(Boolean);
  if (tokens.length < 2) return '';

  const candidateTokens: string[] = [];
  for (const token of tokens) {
    if (/^[A-Z]{2,8}$/.test(token)) break;
    if (NOISE_NAME_WORD_RE.test(token)) break;
    if (!/^[A-Za-z][A-Za-z'\-.]*$/.test(token)) break;
    candidateTokens.push(token);
    if (candidateTokens.length >= 3) break;
  }

  const candidate = normalizeWhitespace(candidateTokens.join(' '));
  return isLikelyPersonName(candidate) ? candidate : '';
}

function isLikelyOrganizationName(value: string): boolean {
  const trimmed = normalizeWhitespace(value);
  if (!trimmed) return false;
  if (trimmed.length < 2 || trimmed.length > 80) return false;
  if (hasContactToken(trimmed)) return false;

  if (/^[A-Z]{2,8}$/.test(trimmed)) return true;
  if (COMMON_ORG_WORD_RE.test(trimmed)) return true;

  // Many organizations appear as two+ capitalized words without suffixes.
  const tokens = trimmed.split(' ').filter(Boolean);
  if (tokens.length >= 2 && tokens.length <= 6) {
    const capitalized = tokens.filter((token) => /^[A-Z][A-Za-z0-9&'\-.]+$/.test(token)).length;
    return capitalized >= Math.max(2, tokens.length - 1);
  }

  return false;
}

function stripContactTokens(value: string): string {
  return normalizeWhitespace(value.replace(CONTACT_TOKEN_GLOBAL_RE, ' '));
}

function isLikelyServiceLine(value: string): boolean {
  const trimmed = normalizeWhitespace(value);
  if (!trimmed || hasContactToken(trimmed)) return false;

  const parts = trimmed
    .split(/\s*[/|,]\s*/)
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean);

  if (parts.length < 2) return false;
  if (!SERVICE_LINE_TOKEN_RE.test(trimmed)) return false;

  const uppercaseLike = parts.filter((part) => {
    const letters = part.replace(/[^A-Za-z]/g, '');
    if (!letters) return false;
    return letters === letters.toUpperCase();
  }).length;

  return uppercaseLike >= Math.max(2, parts.length - 1);
}

function isLikelyTitleLine(value: string): boolean {
  const trimmed = normalizeWhitespace(value);
  if (!trimmed || hasContactToken(trimmed)) return false;
  if (isLikelyServiceLine(trimmed)) return false;
  if (COMMON_ORG_WORD_RE.test(trimmed) && !TITLE_HINT_RE.test(trimmed)) return false;

  if (TITLE_HINT_RE.test(trimmed)) return true;

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 8) return false;

  const alphaOnly = trimmed.replace(/[^A-Za-z]/g, '');
  if (!alphaOnly) return false;
  const isAllCaps = alphaOnly === alphaOnly.toUpperCase();
  return isAllCaps && !isLikelyPersonName(trimmed);
}

function extractCompanyFromLogoText(line: string): string {
  const match = LOGO_OF_RE.exec(line);
  if (!match) return '';
  return normalizeWhitespace(match[1] ?? '');
}

function inferBusinessCardIdentity(lines: string[]): {
  fullName: string;
  company: string;
  title: string;
  serviceTags: string[];
} {
  const normalizedLines = lines
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);

  if (normalizedLines.length === 0) {
    return { fullName: '', company: '', title: '', serviceTags: [] };
  }

  let fullName = '';
  let company = '';
  let title = '';
  const serviceTags: string[] = [];
  let nameIndex = -1;

  for (let i = 0; i < normalizedLines.length; i += 1) {
    const line = normalizedLines[i];
    const isLogoLine = /\blogo\s+of\b/i.test(line);

    if (!company) {
      const logoCompany = extractCompanyFromLogoText(line);
      if (logoCompany) {
        company = logoCompany;
      }
    }

    if (isLogoLine) {
      continue;
    }

    if (isLikelyServiceLine(line)) {
      serviceTags.push(line);
      continue;
    }

    if (!fullName && isLikelyPersonName(line)) {
      fullName = line;
      nameIndex = i;
      continue;
    }

    if (!fullName) {
      const extractedName = extractLikelyNameFromFragment(line);
      if (extractedName) {
        fullName = extractedName;
        nameIndex = i;
      }
    }
  }

  const titleScanStart = nameIndex >= 0 ? nameIndex + 1 : 0;
  for (let i = titleScanStart; i < normalizedLines.length; i += 1) {
    const line = normalizedLines[i];
    if (line === fullName || serviceTags.includes(line)) continue;
    if (isLikelyTitleLine(line)) {
      title = line;
      break;
    }
  }

  if (!company) {
    for (const line of normalizedLines) {
      if (line === fullName || line === title) continue;
      if (serviceTags.includes(line)) continue;
      if (isLikelyOrganizationName(line) && !isLikelyPersonName(line)) {
        company = line;
        break;
      }
    }
  }

  if ((!fullName || !company) && normalizedLines.length > 0) {
    const fallbackAnchor = nameIndex >= 0 ? nameIndex : 0;
    const fallback = inferNameAndOrganizationFromContext(normalizedLines, fallbackAnchor);
    if (!fullName && fallback.fullName) {
      fullName = fallback.fullName;
    }
    if (!company && fallback.organization && !isLikelyServiceLine(fallback.organization)) {
      company = fallback.organization;
    }
  }

  return { fullName, company, title, serviceTags };
}

function inferNameAndOrganizationFromContext(lines: string[], anchorIndex: number): { fullName: string; organization: string } {
  const candidateLines = [
    lines[anchorIndex] ?? '',
    lines[anchorIndex - 1] ?? '',
    lines[anchorIndex + 1] ?? '',
    lines[anchorIndex - 2] ?? '',
    lines[anchorIndex + 2] ?? '',
  ]
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);

  if (DEBUG_NAME_ORG_INFERENCE) {
    console.log('[doc-intel] name/org inference candidates', {
      anchorIndex,
      candidateLines,
    });
  }

  let fullName = '';
  let organization = '';

  for (const line of candidateLines) {
    const stripped = stripContactTokens(line);
    if (!stripped) continue;

    const parts = stripped
      .split(/\s{2,}|\||,|;|\//)
      .map((part) => normalizeWhitespace(part))
      .filter(Boolean);

    const fragments = parts.length > 1 ? parts : [stripped, ...parts];

    for (const fragment of fragments) {
      const inlineAcronymMatch = /^(.+?)\s+([A-Z]{2,8})$/.exec(fragment);
      if (inlineAcronymMatch) {
        const possibleName = normalizeWhitespace(inlineAcronymMatch[1]);
        const possibleOrg = inlineAcronymMatch[2];
        if (!fullName && isLikelyPersonName(possibleName)) {
          fullName = possibleName;
        }
        if (!organization) {
          organization = possibleOrg;
        }
        if (fullName && organization) break;
        continue;
      }

      if (!fullName && isLikelyPersonName(fragment)) {
        fullName = fragment;
        continue;
      }

      if (!fullName) {
        const extractedName = extractLikelyNameFromFragment(fragment);
        if (extractedName) {
          fullName = extractedName;
          continue;
        }
      }

      const fragmentLooksLikeOrgAcronym = /^[A-Z]{2,8}$/.test(fragment);
      const fragmentHasOrgWord = COMMON_ORG_WORD_RE.test(fragment);
      const fragmentLooksLikePerson = isLikelyPersonName(fragment);

      if (
        !organization
        && isLikelyOrganizationName(fragment)
        && (!fragmentLooksLikePerson || fragmentLooksLikeOrgAcronym || fragmentHasOrgWord)
      ) {
        organization = fragment;
      }
      if (fullName && organization) break;
    }

    if (fullName && organization) break;
  }

  if (!organization) {
    for (const line of candidateLines) {
      const stripped = stripContactTokens(line);
      const acronym = stripped.split(/\s+/).find((token) => /^[A-Z]{2,8}$/.test(token));
      if (acronym) {
        organization = acronym;
        break;
      }
    }
  }

  return { fullName, organization };
}

function normalizeSigninHeaderValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isRepeatedHeaderLikeSigninRow(
  rawRow: Record<string, string>,
  detectedHeaders: string[],
  headerMapping: HeaderMapping[],
): boolean {
  const entries = Object.entries(rawRow);
  if (entries.length === 0) return false;

  const cells = entries.map(([, value]) => value.trim());
  const nonEmptyCells = cells.filter(Boolean);
  if (nonEmptyCells.length === 0) return false;

  const normalizedHeaders = detectedHeaders.map((header) => normalizeSigninHeaderValue(header));
  const headerMatches = cells.every((value, index) => {
    const normalizedValue = normalizeSigninHeaderValue(value);
    const normalizedHeader = normalizedHeaders[index] ?? '';
    return !normalizedValue || !normalizedHeader || normalizedValue === normalizedHeader;
  });

  if (headerMatches) return true;

  let labelLikeCount = 0;
  entries.forEach(([key, value], index) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    const normalizedValue = normalizeSigninHeaderValue(trimmed);
    const normalizedHeader = normalizeSigninHeaderValue(detectedHeaders[index] ?? key);
    if (normalizedHeader && normalizedValue === normalizedHeader) {
      labelLikeCount += 1;
      return;
    }

    const normalizedField = headerMapping[index]?.normalized;
    const aliases = normalizedField ? SIGNIN_HEADER_ALIASES[normalizedField] ?? [] : [];
    if (aliases.some((alias) => normalizeSigninHeaderValue(alias) === normalizedValue)) {
      labelLikeCount += 1;
      return;
    }

    const looksLikeAnyAlias = Object.values(SIGNIN_HEADER_ALIASES)
      .flat()
      .some((alias) => normalizeSigninHeaderValue(alias) === normalizedValue);
    if (looksLikeAnyAlias) {
      labelLikeCount += 1;
    }
  });

  return labelLikeCount >= 2 && labelLikeCount >= Math.ceil(nonEmptyCells.length * 0.6);
}

// ── Sign-in sheet extraction ───────────────────────────────────────────────────

/**
 * Extract sign-in sheet data using structure-first approach.
 * Detects table, maps headers dynamically, preserves all rows & extra columns.
 */
export function extractSigninSheet(parseResult: NormalizedParseResult): SigninExtractionResult {
  const analysis = analyzeStructure(parseResult.text, parseResult.markdown);

  if (analysis.structure === 'table' && analysis.rawRows.length > 0) {
    return extractFromTable(analysis);
  }

  // Fallback: treat as unstructured, try to extract at least one row from text
  return extractSigninFromText(analysis);
}

function extractFromTable(analysis: StructureAnalysis): SigninExtractionResult {
  const headerMapping = buildSigninHeaderMap(analysis.detectedHeaders);
  const filteredRawRows = analysis.rawRows.filter(
    (rawRow) => !isRepeatedHeaderLikeSigninRow(rawRow, analysis.detectedHeaders, headerMapping),
  );

  const normalizedRows: NormalizedSigninRow[] = filteredRawRows.map((rawRow) => {
    const normalized: NormalizedSigninRow = {
      id: crypto.randomUUID(),
      fullName: '',
      organization: '',
      email: '',
      phone: '',
      screening: '',
      shareInfo: '',
      date: '',
      comments: '',
      extraFields: {},
    };

    for (const mapping of headerMapping) {
      const value = rawRow[mapping.original] ?? '';
      if (mapping.normalized) {
        normalized[mapping.normalized] = value;
      } else {
        normalized.extraFields[mapping.original] = value;
      }
    }

    return normalized;
  });

  const mappedCount = headerMapping.filter((m) => m.normalized !== null).length;
  const confidence =
    analysis.detectedHeaders.length > 0
      ? mappedCount / analysis.detectedHeaders.length
      : 0;

  return {
    status: 'complete',
    structure: analysis.structure,
    detectedHeaders: analysis.detectedHeaders,
    headerMapping,
    normalizedRows,
    rawRows: filteredRawRows,
    confidence,
  };
}

function extractSigninFromText(analysis: StructureAnalysis): SigninExtractionResult {
  const emails = extractEmails(analysis.fullText);
  const phones = extractPhones(analysis.fullText);

  if (emails.length === 0 && phones.length === 0) {
    return {
      status: analysis.fullText.trim().length > 0 ? 'complete' : 'failed',
      structure: analysis.structure,
      detectedHeaders: analysis.detectedHeaders,
      headerMapping: [],
      normalizedRows: [],
      rawRows: [],
      confidence: 0,
    };
  }

  const lines = analysis.fullText
    .split('\n')
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);

  const anchorIndexes: number[] = [];
  lines.forEach((line, index) => {
    if (extractEmails(line).length > 0 || extractPhones(line).length > 0) {
      anchorIndexes.push(index);
    }
  });

  // Build one row per detected contact line when possible.
  const rowCount = Math.max(anchorIndexes.length, emails.length, phones.length, 1);
  const normalizedRows: NormalizedSigninRow[] = [];

  for (let i = 0; i < rowCount; i++) {
    const anchorIndex = anchorIndexes[i] ?? Math.min(i, Math.max(lines.length - 1, 0));
    const anchorLine = anchorIndex >= 0 ? lines[anchorIndex] ?? '' : '';
    const lineEmails = extractEmails(anchorLine);
    const linePhones = extractPhones(anchorLine);
    const inferredIdentity = inferNameAndOrganizationFromContext(lines, anchorIndex);

    normalizedRows.push({
      id: crypto.randomUUID(),
      fullName: inferredIdentity.fullName,
      organization: inferredIdentity.organization,
      email: lineEmails[0] ?? emails[i] ?? '',
      phone: linePhones[0] ?? phones[i] ?? '',
      screening: '',
      shareInfo: '',
      date: '',
      comments: '',
      extraFields: {},
    });
  }

  return {
    status: 'complete',
    structure: analysis.structure,
    detectedHeaders: analysis.detectedHeaders,
    headerMapping: [],
    normalizedRows,
    rawRows: analysis.rawRows,
    confidence: 0.3,
  };
}

// ── Business card extraction ───────────────────────────────────────────────────

/**
 * Extract business card data using structure-first approach.
 * Detects labels dynamically, infers field types from content patterns.
 */
export function extractBusinessCard(parseResult: NormalizedParseResult): CardExtractionResult {
  const analysis = analyzeStructure(parseResult.text, parseResult.markdown);

  if (analysis.structure === 'single-entity' && analysis.rawRows.length > 0) {
    return extractCardFromLabels(analysis);
  }

  // Even if structure is table or unstructured, try pattern-based extraction
  return extractCardFromPatterns(analysis);
}

function extractCardFromLabels(analysis: StructureAnalysis): CardExtractionResult {
  const headerMapping = buildCardLabelMap(analysis.detectedHeaders);
  const rawRow = analysis.rawRows[0] ?? {};

  const card: NormalizedCard = {
    id: crypto.randomUUID(),
    fullName: '',
    firstName: '',
    lastName: '',
    company: '',
    title: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    social: '',
    extraFields: {},
    rawText: analysis.fullText,
  };

  for (const mapping of headerMapping) {
    const value = rawRow[mapping.original] ?? '';
    if (mapping.normalized) {
      card[mapping.normalized] = value;
    } else {
      card.extraFields[mapping.original] = value;
    }
  }

  // Also run pattern detection on values that may have been mapped to wrong fields
  enrichCardFromPatterns(card, analysis.fullText);
  syncCardNameFields(card);

  const mappedCount = headerMapping.filter((m) => m.normalized !== null).length;
  const confidence =
    analysis.detectedHeaders.length > 0
      ? mappedCount / analysis.detectedHeaders.length
      : 0;

  return {
    status: 'complete',
    structure: analysis.structure,
    detectedHeaders: analysis.detectedHeaders,
    headerMapping,
    card,
    confidence,
  };
}

function extractCardFromPatterns(analysis: StructureAnalysis): CardExtractionResult {
  const card: NormalizedCard = {
    id: crypto.randomUUID(),
    fullName: '',
    firstName: '',
    lastName: '',
    company: '',
    title: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    social: '',
    extraFields: {},
    rawText: analysis.fullText,
  };

  enrichCardFromPatterns(card, analysis.fullText);

  // Check rawRows for any label-value data
  if (analysis.rawRows.length > 0) {
    const headerMapping = buildCardLabelMap(analysis.detectedHeaders);
    const rawRow = analysis.rawRows[0];
    for (const mapping of headerMapping) {
      const value = rawRow[mapping.original] ?? '';
      if (value && mapping.normalized) {
      const current = card[mapping.normalized];
      if (!current) {
          card[mapping.normalized] = value;
        }
      } else if (value && !mapping.normalized) {
        card.extraFields[mapping.original] = value;
      }
    }
  }

  syncCardNameFields(card);

  const filledFields = [
    card.fullName, card.firstName, card.lastName, card.company,
    card.title, card.email, card.phone, card.website, card.address, card.social,
  ].filter((v) => v.length > 0).length;

  const confidence = Math.min(filledFields / 4, 1); // 4+ fields = high confidence

  return {
    status: analysis.fullText.trim().length > 0 ? 'complete' : 'failed',
    structure: analysis.structure,
    detectedHeaders: analysis.detectedHeaders,
    headerMapping: analysis.detectedHeaders.length > 0
      ? buildCardLabelMap(analysis.detectedHeaders)
      : [],
    card,
    confidence,
  };
}

/**
 * Enrich a card by scanning full text for content patterns (email, phone, url, etc.)
 * Only fills empty fields — does not overwrite label-mapped values.
 */
function enrichCardFromPatterns(card: NormalizedCard, text: string): void {
  const emails = extractEmails(text);
  const phones = extractPhones(text);
  const urls = extractUrls(text);

  if (!card.email && emails.length > 0) {
    card.email = emails[0];
    // If multiple emails, preserve extras
    if (emails.length > 1) {
      card.extraFields['additionalEmails'] = emails.slice(1).join(', ');
    }
  }

  if (!card.phone && phones.length > 0) {
    card.phone = phones[0];
    if (phones.length > 1) {
      card.extraFields['additionalPhones'] = phones.slice(1).join(', ');
    }
  }

  if (!card.website && urls.length > 0) {
    card.website = urls[0];
  }

  // Try to infer other fields from remaining lines
  const lines = text.split('\n').map((l) => normalizeWhitespace(l)).filter(Boolean);
  const nonContactLines: string[] = [];

  for (const line of lines) {
    // Skip lines already captured as email/phone/url
    if (emails.some((e) => line.includes(e))) continue;
    if (phones.some((p) => line.includes(p))) continue;
    if (urls.some((u) => line.includes(u))) continue;

    nonContactLines.push(line);

    const inferences = inferContentTypes(line);
    if (inferences.some((i) => i.type === 'address') && !card.address) {
      card.address = line;
      continue;
    }
    if (inferences.some((i) => i.type === 'social') && !card.social) {
      card.social = line;
      continue;
    }
  }

  // Fill identity fields from unlabeled text blocks using card-specific ranking.
  if ((!card.fullName || !card.company || !card.title) && nonContactLines.length > 0) {
    const identity = inferBusinessCardIdentity(nonContactLines);
    if (!card.fullName && identity.fullName) {
      card.fullName = identity.fullName;
    }
    if (!card.company && identity.company) {
      card.company = identity.company;
    }
    if (!card.title && identity.title) {
      card.title = identity.title;
    }
    if (identity.serviceTags.length > 0 && !card.extraFields.serviceTags) {
      card.extraFields.serviceTags = identity.serviceTags.join(' | ');
    }
  }
}
