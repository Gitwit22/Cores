/**
 * Structure-First Document Analyzer
 *
 * Detects whether parsed document content is table-like (rows + headers),
 * single-entity (card/form), or unstructured text. Drives dynamic extraction
 * instead of relying on hardcoded field schemas.
 */

export type DocumentStructure = 'table' | 'single-entity' | 'unstructured';

export interface StructureAnalysis {
  structure: DocumentStructure;
  /** Detected column/label headers when table-like */
  detectedHeaders: string[];
  /** Raw rows parsed from table markdown (header values mapped per row) */
  rawRows: Array<Record<string, string>>;
  /** Full parsed text for fallback extraction */
  fullText: string;
}

/**
 * Markdown table row regex — matches `| col1 | col2 | ... |`
 */
const TABLE_ROW_RE = /^\|(.+)\|$/;

/**
 * Markdown separator row — `|---|---|` or `| :---: | --- |`
 */
const SEPARATOR_RE = /^\|[\s:]*-+[\s:]*(\|[\s:]*-+[\s:]*)+\|$/;

const SIGNIN_TEXT_HEADER_ALIASES: Record<string, string[]> = {
  fullName: ['full name', 'name', 'attendee', 'participant', 'contact'],
  organization: ['organization', 'org', 'company', 'agency', 'affiliation'],
  email: ['email', 'e-mail', 'email address'],
  phone: ['phone', 'phone number', 'mobile', 'cell', 'telephone', 'tel'],
  screening: ['screening', 'screened'],
  shareInfo: ['share info', 'share information', 'share'],
  date: ['date', 'sign date', 'signed date'],
  comments: ['comments', 'comment', 'notes', 'remarks'],
};

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitAlignedColumns(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed) return [];

  if (trimmed.includes('|')) {
    return trimmed
      .split('|')
      .map((cell) => cell.trim())
      .filter(Boolean);
  }

  return trimmed
    .split(/\t+|\s{2,}/)
    .map((cell) => cell.trim())
    .filter(Boolean);
}

function looksLikeKnownSigninHeader(cell: string): boolean {
  const normalized = normalizeToken(cell);
  if (!normalized) return false;

  return Object.values(SIGNIN_TEXT_HEADER_ALIASES)
    .flat()
    .some((alias) => normalizeToken(alias) === normalized);
}

function looksLikeSeparatorLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return /^[-=\s|:]{6,}$/.test(trimmed);
}

function extractAlignedTextTable(content: string): { headers: string[]; rows: Array<Record<string, string>> } {
  const lines = content.split('\n').map((line) => line.trimRight());

  for (let i = 0; i < lines.length; i++) {
    const headerCells = splitAlignedColumns(lines[i]);
    if (headerCells.length < 3) continue;

    const recognizedHeaders = headerCells.filter((cell) => looksLikeKnownSigninHeader(cell)).length;
    if (recognizedHeaders < 2) continue;

    let cursor = i + 1;
    if (cursor < lines.length && looksLikeSeparatorLine(lines[cursor])) {
      cursor += 1;
    }

    const rows: Array<Record<string, string>> = [];
    while (cursor < lines.length) {
      const cells = splitAlignedColumns(lines[cursor]);
      if (cells.length < Math.min(2, headerCells.length)) break;

      const row: Record<string, string> = {};
      for (let col = 0; col < headerCells.length; col++) {
        row[headerCells[col]] = cells[col] ?? '';
      }

      const hasContent = Object.values(row).some((value) => value.trim().length > 0);
      if (hasContent) {
        rows.push(row);
      }
      cursor += 1;
    }

    if (rows.length > 0) {
      return { headers: headerCells, rows };
    }
  }

  return { headers: [], rows: [] };
}

/**
 * Analyze parsed text/markdown to detect document structure.
 */
export function analyzeStructure(text: string, markdown: string): StructureAnalysis {
  // Prefer markdown for table detection — LlamaParse returns markdown tables
  const tableResult = extractMarkdownTables(markdown || text);

  if (tableResult.rows.length > 0) {
    return {
      structure: 'table',
      detectedHeaders: tableResult.headers,
      rawRows: tableResult.rows,
      fullText: text,
    };
  }

  const alignedTableResult = extractAlignedTextTable(text);
  if (alignedTableResult.rows.length > 0) {
    return {
      structure: 'table',
      detectedHeaders: alignedTableResult.headers,
      rawRows: alignedTableResult.rows,
      fullText: text,
    };
  }

  // Check if it looks like a single entity (card, form, label:value pairs)
  const labelValuePairs = extractLabelValuePairs(text);
  if (labelValuePairs.length >= 2) {
    return {
      structure: 'single-entity',
      detectedHeaders: labelValuePairs.map((p) => p.label),
      rawRows: [Object.fromEntries(labelValuePairs.map((p) => [p.label, p.value]))],
      fullText: text,
    };
  }

  return {
    structure: 'unstructured',
    detectedHeaders: [],
    rawRows: [],
    fullText: text,
  };
}

/**
 * Parse markdown tables into headers + row records.
 */
function extractMarkdownTables(
  content: string,
): { headers: string[]; rows: Array<Record<string, string>> } {
  const lines = content.split('\n').map((l) => l.trim());
  const headers: string[] = [];
  const rows: Array<Record<string, string>> = [];

  let i = 0;
  while (i < lines.length) {
    const headerMatch = TABLE_ROW_RE.exec(lines[i]);
    if (headerMatch && i + 1 < lines.length && SEPARATOR_RE.test(lines[i + 1])) {
      // Found a table header + separator
      const rawHeaders = headerMatch[1].split('|').map((h) => h.trim()).filter(Boolean);
      if (rawHeaders.length === 0) {
        i++;
        continue;
      }

      // Use first table found
      if (headers.length === 0) {
        headers.push(...rawHeaders);
      }

      i += 2; // skip header + separator

      // Parse data rows
      while (i < lines.length) {
        const rowMatch = TABLE_ROW_RE.exec(lines[i]);
        if (!rowMatch) break;

        const cells = rowMatch[1].split('|').map((c) => c.trim());
        const row: Record<string, string> = {};
        for (let col = 0; col < headers.length; col++) {
          row[headers[col]] = cells[col] ?? '';
        }

        // Skip rows that are completely empty
        const hasContent = Object.values(row).some((v) => v.length > 0);
        if (hasContent) {
          rows.push(row);
        }
        i++;
      }
      continue;
    }
    i++;
  }

  return { headers, rows };
}

interface LabelValuePair {
  label: string;
  value: string;
}

/**
 * Extract label: value pairs from unstructured text (common in business cards, forms).
 */
function extractLabelValuePairs(text: string): LabelValuePair[] {
  const pairs: LabelValuePair[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    // Match "Label: Value" or "Label - Value"
    const match = /^([A-Za-z][A-Za-z\s]{0,30}?)\s*[:–—-]\s+(.+)$/.exec(line.trim());
    if (match) {
      pairs.push({ label: match[1].trim(), value: match[2].trim() });
    }
  }

  return pairs;
}
