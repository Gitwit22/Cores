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

  const normalizedRows: NormalizedSigninRow[] = analysis.rawRows.map((rawRow) => {
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
    rawRows: analysis.rawRows,
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

  // Build one row per detected contact from text
  const rowCount = Math.max(emails.length, phones.length, 1);
  const normalizedRows: NormalizedSigninRow[] = [];

  for (let i = 0; i < rowCount; i++) {
    normalizedRows.push({
      id: crypto.randomUUID(),
      fullName: '',
      organization: '',
      email: emails[i] ?? '',
      phone: phones[i] ?? '',
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
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    // Skip lines already captured as email/phone/url
    if (emails.some((e) => line.includes(e))) continue;
    if (phones.some((p) => line.includes(p))) continue;
    if (urls.some((u) => line.includes(u))) continue;

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
}
