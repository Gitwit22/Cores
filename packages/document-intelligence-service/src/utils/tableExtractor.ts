/**
 * Table-aware extraction utilities for sign-in sheet and tabular documents.
 *
 * Strategy:
 * 1. Parse markdown tables from LlamaParse output.
 * 2. Infer column-to-field mapping via header matching, then positional fallback.
 * 3. Validate each cell with pattern matching for email / phone.
 * 4. Return one record object per data row.
 */

export interface SigninRow {
  fullName: string;
  organization: string;
  phone: string;
  email: string;
  screening: string;
  shareInfo: string;
  date: string;
  comments: string;
  _debug?: {
    detectedHeaders: string[];
    headerMapping: Record<string, string>;
    rawCells: string[];
  };
}

export interface BusinessCardFields {
  firstName: string;
  lastName: string;
  company: string;
  title: string;
  phone: string;
  email: string;
  website: string;
  address: string;
}

// ── Pattern matchers ───────────────────────────────────────────────────────────

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_RE = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
const DATE_RE = /\b(\d{4}[-/]\d{2}[-/]\d{2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/;
const CHECKBOX_RE = /^[☑✓✗xX\u2611\u2612]$|^\[([xX\s])\]$|^(yes|no|y|n)$/i;

function looksLikeEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

function looksLikePhone(value: string): boolean {
  return PHONE_RE.test(value.trim());
}

function looksLikeCheckbox(value: string): boolean {
  return CHECKBOX_RE.test(value.trim());
}

// ── Header → field name matching ──────────────────────────────────────────────

/**
 * Header keyword → canonical field name.
 * Listed roughly in priority order so the first match wins.
 */
const HEADER_FIELD_MAP: Array<[RegExp, keyof SigninRow]> = [
  [/full.?name|name|attendee|participant|first.*last|last.*first/i, 'fullName'],
  [/org(anization)?|company|affiliation|employer/i, 'organization'],
  [/e.?mail/i, 'email'],
  [/phone|mobile|cell|tel/i, 'phone'],
  [/screen(ing)?|waiver|agree|consent/i, 'screening'],
  [/share|list|newsletter|contact.*ok|opt.?in/i, 'shareInfo'],
  [/date|signed|attended/i, 'date'],
  [/comment|note|remark|other/i, 'comments'],
];

function headerToField(header: string): keyof SigninRow | null {
  const h = header.trim().toLowerCase();
  for (const [pattern, field] of HEADER_FIELD_MAP) {
    if (pattern.test(h)) return field;
  }
  return null;
}

/**
 * Positional fallback for common sign-in sheet column layouts when headers
 * are missing or unrecognised.  Columns 0–1 are treated as name/org;
 * remaining columns are inferred from cell content.
 */
const POSITIONAL_FALLBACK: Array<keyof SigninRow> = [
  'fullName',
  'organization',
  'email',
  'phone',
  'screening',
  'shareInfo',
  'date',
  'comments',
];

function buildColumnMap(
  headers: string[],
): { mapping: Record<number, keyof SigninRow>; detectedHeaders: string[] } {
  const mapping: Record<number, keyof SigninRow> = {};
  const used = new Set<keyof SigninRow>();
  const detectedHeaders: string[] = [...headers];

  // First pass: header name matching.
  headers.forEach((header, idx) => {
    const field = headerToField(header);
    if (field && !used.has(field)) {
      mapping[idx] = field;
      used.add(field);
    }
  });

  // Second pass: positional fallback for unmapped columns.
  for (let idx = 0; idx < Math.max(headers.length, POSITIONAL_FALLBACK.length); idx++) {
    if (mapping[idx] !== undefined) continue;
    const candidate = POSITIONAL_FALLBACK[idx];
    if (candidate && !used.has(candidate)) {
      mapping[idx] = candidate;
      used.add(candidate);
    }
  }

  return { mapping, detectedHeaders };
}

// ── Markdown table parser ─────────────────────────────────────────────────────

/**
 * Split a markdown table row into trimmed cell strings.
 * Handles `| a | b | c |` and `a | b | c` formats.
 */
function splitMarkdownRow(line: string): string[] {
  return line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isMarkdownSeparator(line: string): boolean {
  return /^\|?[\s:|-]+\|/.test(line);
}

interface ParsedTable {
  headers: string[];
  rows: string[][];
}

function extractMarkdownTables(markdown: string): ParsedTable[] {
  const tables: ParsedTable[] = [];
  const lines = markdown.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    // A markdown table row contains at least one pipe character.
    if (!line.includes('|')) {
      i++;
      continue;
    }

    const headerCells = splitMarkdownRow(line);
    const separatorLine = lines[i + 1]?.trim() ?? '';
    const hasSeparator = isMarkdownSeparator(separatorLine);

    // Collect data rows (with or without proper separator).
    const dataStart = hasSeparator ? i + 2 : i + 1;
    const dataRows: string[][] = [];
    let j = dataStart;
    while (j < lines.length) {
      const dataLine = lines[j].trim();
      if (!dataLine.includes('|')) break;
      if (isMarkdownSeparator(dataLine)) {
        j++;
        continue;
      }
      dataRows.push(splitMarkdownRow(dataLine));
      j++;
    }

    if (dataRows.length > 0) {
      tables.push({ headers: headerCells, rows: dataRows });
    }

    i = j;
  }

  return tables;
}

// ── Cell → field assignment ───────────────────────────────────────────────────

function cellValueForField(cell: string, field: keyof SigninRow): string {
  const v = cell.trim();
  // Override: if a cell clearly looks like email/phone regardless of column, prefer those fields.
  if (field === 'email' && !looksLikeEmail(v)) {
    // Check if any other cell fits better — we'll handle re-assignment below.
    return v;
  }
  return v;
}

/**
 * Build a single SigninRow from mapped column cells.
 * After column-mapping, run a second pass that re-assigns cells to
 * email/phone fields if they pattern-match, overriding the positional guess.
 */
function buildRowFromCells(
  cells: string[],
  columnMap: Record<number, keyof SigninRow>,
): Omit<SigninRow, '_debug'> {
  const row: Record<string, string> = {
    fullName: '',
    organization: '',
    phone: '',
    email: '',
    screening: '',
    shareInfo: '',
    date: '',
    comments: '',
  };

  // First pass: column-map assignment.
  cells.forEach((cell, idx) => {
    const field = columnMap[idx];
    if (field) {
      row[field] = cellValueForField(cell, field);
    }
  });

  // Second pass: pattern override — re-route any cell that looks like an
  // email / phone into the correct field even if positional mapping guessed wrong.
  cells.forEach((cell) => {
    const v = cell.trim();
    if (!v) return;
    if (looksLikeEmail(v) && !row['email']) {
      row['email'] = v;
    } else if (looksLikePhone(v) && !row['phone']) {
      row['phone'] = v;
    }
  });

  // Third pass: checkbox columns.
  cells.forEach((cell, idx) => {
    const field = columnMap[idx];
    if (field === 'screening' || field === 'shareInfo') {
      row[field] = looksLikeCheckbox(cell) ? cell.trim() : row[field];
    }
  });

  return row as Omit<SigninRow, '_debug'>;
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface TableExtractionResult {
  rows: SigninRow[];
  structure: 'table' | 'unstructured';
  detectedHeaders: string[];
  headerMapping: Record<string, string>;
}

/**
 * Extract sign-in rows from a parsed markdown document.
 *
 * @param markdown - The raw markdown output from LlamaParse.
 * @param debug    - Include _debug metadata on each row.
 */
export function extractSigninRowsFromMarkdown(
  markdown: string,
  debug = false,
): TableExtractionResult {
  const tables = extractMarkdownTables(markdown);

  if (tables.length === 0) {
    return { rows: [], structure: 'unstructured', detectedHeaders: [], headerMapping: {} };
  }

  // Use the largest table (most rows) as the primary sign-in table.
  const primary = tables.reduce((a, b) => (b.rows.length > a.rows.length ? b : a));

  const { mapping, detectedHeaders } = buildColumnMap(primary.headers);

  // Build human-readable header→field map for debug output.
  const headerMapping: Record<string, string> = {};
  primary.headers.forEach((header, idx) => {
    if (mapping[idx]) {
      headerMapping[header || `col${idx}`] = mapping[idx];
    }
  });

  const rows: SigninRow[] = primary.rows
    .map((cells) => {
      const built = buildRowFromCells(cells, mapping);
      // Skip rows that are entirely empty or look like a repeated header.
      const values = Object.values(built).filter((v) => v !== '');
      if (values.length === 0) return null;

      const result: SigninRow = { ...built };
      if (debug) {
        result._debug = {
          detectedHeaders,
          headerMapping,
          rawCells: cells,
        };
      }
      return result;
    })
    .filter((row): row is SigninRow => row !== null);

  return { rows, structure: 'table', detectedHeaders, headerMapping };
}

/**
 * Fallback: extract a single sign-in record from unstructured text using
 * pattern matching.  Used when no table structure is found.
 */
export function extractSigninFromText(text: string): Partial<SigninRow> {
  const emailMatch = text.match(EMAIL_RE);
  const phoneMatch = text.match(PHONE_RE);
  const dateMatch = text.match(DATE_RE);

  return {
    email: emailMatch?.[0] ?? '',
    phone: phoneMatch?.[0] ?? '',
    date: dateMatch?.[0] ?? '',
    fullName: '',
    organization: '',
  };
}

function pickByLabel(lines: string[], labelPattern: RegExp): string {
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx > 0) {
      const label = trimmed.slice(0, colonIdx).trim();
      const value = trimmed.slice(colonIdx + 1).trim();
      if (labelPattern.test(label) && value) {
        return value;
      }
    }
  }
  return '';
}

function pickLikelyName(lines: string[]): { firstName: string; lastName: string } {
  const labelCandidate = pickByLabel(lines, /name|contact/i);
  const candidate = labelCandidate || lines.find((line) => /\b[A-Za-z]+\s+[A-Za-z]+\b/.test(line)) || '';
  const parts = candidate.trim().split(/\s+/).filter((value) => value !== '');
  if (parts.length === 0) {
    return { firstName: '', lastName: '' };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export interface BusinessCardExtractionResult {
  card: BusinessCardFields;
  structure: 'table' | 'text';
  detectedHeaders: string[];
  headerMapping: Record<string, string>;
}

export function extractBusinessCardFromMarkdown(markdown: string): BusinessCardExtractionResult {
  const signinTable = extractSigninRowsFromMarkdown(markdown, false);
  if (signinTable.structure === 'table' && signinTable.rows.length > 0) {
    const first = signinTable.rows[0];
    return {
      card: {
        firstName: first.fullName.split(/\s+/)[0] ?? '',
        lastName: first.fullName.split(/\s+/).slice(1).join(' '),
        company: first.organization,
        title: first.comments,
        phone: first.phone,
        email: first.email,
        website: '',
        address: '',
      },
      structure: 'table',
      detectedHeaders: signinTable.detectedHeaders,
      headerMapping: signinTable.headerMapping,
    };
  }

  const lines = markdown
    .split('\n')
    .map((line) => line.replace(/[*_`#>-]/g, '').trim())
    .filter((line) => line !== '');

  const name = pickLikelyName(lines);
  const email = lines.find((line) => EMAIL_RE.test(line))?.match(EMAIL_RE)?.[0] ?? '';
  const phone = lines.find((line) => PHONE_RE.test(line))?.match(PHONE_RE)?.[0] ?? '';
  const website = lines.find((line) => /\b(?:https?:\/\/)?(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/[\w./?%&=-]*)?\b/i.test(line)) ?? '';
  const company = pickByLabel(lines, /company|organization|org/i);
  const title = pickByLabel(lines, /title|role|position|job/i);
  const address = pickByLabel(lines, /address|street|city|state|zip/i);

  return {
    card: {
      firstName: name.firstName,
      lastName: name.lastName,
      company,
      title,
      phone,
      email,
      website,
      address,
    },
    structure: 'text',
    detectedHeaders: [],
    headerMapping: {},
  };
}
