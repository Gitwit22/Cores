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

const PHONE_LIKE_RE = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parseHtmlTableRows(section: string): Array<Array<{ text: string; colspan: number }>> {
  const rows: Array<Array<{ text: string; colspan: number }>> = [];
  const rowMatches = section.match(/<tr\b[\s\S]*?<\/tr>/gi) ?? [];

  rowMatches.forEach((rowHtml) => {
    const cells: Array<{ text: string; colspan: number }> = [];
    const cellRegex = /<(th|td)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
    let match: RegExpExecArray | null;

    while ((match = cellRegex.exec(rowHtml)) !== null) {
      const attrs = match[2] ?? '';
      const rawCell = match[3] ?? '';
      const colspanMatch = /colspan\s*=\s*["']?(\d+)/i.exec(attrs);
      const colspan = Math.max(1, Number(colspanMatch?.[1] ?? '1'));
      cells.push({ text: stripHtml(rawCell), colspan });
    }

    if (cells.length > 0) {
      rows.push(cells);
    }
  });

  return rows;
}

function expandColspans(cells: Array<{ text: string; colspan: number }>): string[] {
  const expanded: string[] = [];
  cells.forEach((cell) => {
    for (let i = 0; i < cell.colspan; i++) {
      expanded.push(cell.text);
    }
  });
  return expanded;
}

function extractHtmlTables(content: string): { headers: string[]; rows: Array<Record<string, string>> } {
  const tables = content.match(/<table\b[\s\S]*?<\/table>/gi) ?? [];

  for (const tableHtml of tables) {
    const theadMatch = /<thead\b[\s\S]*?<\/thead>/i.exec(tableHtml);
    const tbodyMatch = /<tbody\b[\s\S]*?<\/tbody>/i.exec(tableHtml);

    const headerRowsRaw = theadMatch ? parseHtmlTableRows(theadMatch[0]) : [];
    const bodyRowsRaw = tbodyMatch ? parseHtmlTableRows(tbodyMatch[0]) : parseHtmlTableRows(tableHtml);
    if (bodyRowsRaw.length === 0) continue;

    let activeHeaders: string[] = [];

    if (headerRowsRaw.length > 0) {
      activeHeaders = expandColspans(headerRowsRaw[0]);

      if (headerRowsRaw.length > 1) {
        const subheaders = expandColspans(headerRowsRaw[1]);
        if (
          subheaders.length >= Math.min(2, activeHeaders.length)
          && isLikelyStackedHeaderRow(subheaders)
        ) {
          activeHeaders = flattenStackedHeaders(activeHeaders, subheaders);
        }
      }
    } else {
      // Fallback when <thead> is missing: infer headers from first row if it looks header-like.
      const firstRow = expandColspans(bodyRowsRaw[0]);
      if (isLikelyStackedHeaderRow(firstRow)) {
        activeHeaders = firstRow;
        bodyRowsRaw.shift();
      }
    }

    if (activeHeaders.length === 0) continue;

    const rows: Array<Record<string, string>> = [];
    bodyRowsRaw.forEach((rowRaw) => {
      const cells = expandColspans(rowRaw);
      const row: Record<string, string> = {};

      for (let col = 0; col < activeHeaders.length; col++) {
        row[activeHeaders[col]] = (cells[col] ?? '').trim();
      }

      const hasContent = Object.values(row).some((value) => value.length > 0);
      if (hasContent) {
        rows.push(row);
      }
    });

    if (rows.length > 0) {
      return {
        headers: activeHeaders,
        rows,
      };
    }
  }

  return { headers: [], rows: [] };
}

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
      .map((cell) => cell.trim());
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

function isLikelyDataCell(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.includes('@')) return true;
  if (PHONE_LIKE_RE.test(trimmed)) return true;
  // Long values are usually row content, not subheaders.
  if (trimmed.length > 28) return true;
  return false;
}

function isLikelyStackedHeaderRow(cells: string[]): boolean {
  const nonEmpty = cells.filter((cell) => cell.trim().length > 0);
  if (nonEmpty.length === 0) return false;

  const knownHeaderCount = nonEmpty.filter((cell) => looksLikeKnownSigninHeader(cell)).length;
  const dataLikeCount = nonEmpty.filter((cell) => isLikelyDataCell(cell)).length;

  return knownHeaderCount >= 2 && knownHeaderCount >= Math.ceil(nonEmpty.length * 0.5) && dataLikeCount === 0;
}

function flattenStackedHeaderCell(parentHeader: string, childHeader: string): string {
  const parent = parentHeader.trim();
  const child = childHeader.trim();

  if (!child) return parent;
  if (!parent) return child;
  if (normalizeToken(parent) === normalizeToken(child)) return child;

  // If child is a known field, use it as canonical column label.
  if (looksLikeKnownSigninHeader(child)) return child;

  return `${parent}: ${child}`;
}

function flattenStackedHeaders(parentHeaders: string[], childHeaders: string[]): string[] {
  return parentHeaders.map((parent, index) => flattenStackedHeaderCell(parent, childHeaders[index] ?? ''));
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

    let activeHeaders = [...headerCells];
    let cursor = i + 1;

    const potentialSubheaderCells = cursor < lines.length ? splitAlignedColumns(lines[cursor]) : [];
    if (
      potentialSubheaderCells.length >= Math.min(2, activeHeaders.length)
      && isLikelyStackedHeaderRow(potentialSubheaderCells)
    ) {
      activeHeaders = flattenStackedHeaders(activeHeaders, potentialSubheaderCells);
      cursor += 1;
    }

    if (cursor < lines.length && looksLikeSeparatorLine(lines[cursor])) {
      cursor += 1;
    }

    const rows: Array<Record<string, string>> = [];
    while (cursor < lines.length) {
      const cells = splitAlignedColumns(lines[cursor]);
      if (cells.length < Math.min(2, headerCells.length)) break;

      const row: Record<string, string> = {};
      for (let col = 0; col < activeHeaders.length; col++) {
        row[activeHeaders[col]] = cells[col] ?? '';
      }

      const hasContent = Object.values(row).some((value) => value.trim().length > 0);
      if (hasContent) {
        rows.push(row);
      }
      cursor += 1;
    }

    if (rows.length > 0) {
      return { headers: activeHeaders, rows };
    }
  }

  return { headers: [], rows: [] };
}

/**
 * Analyze parsed text/markdown to detect document structure.
 */
export function analyzeStructure(text: string, markdown: string): StructureAnalysis {
  const htmlTableResult = extractHtmlTables(markdown || text);
  if (htmlTableResult.rows.length > 0) {
    return {
      structure: 'table',
      detectedHeaders: htmlTableResult.headers,
      rawRows: htmlTableResult.rows,
      fullText: text,
    };
  }

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
      const rawHeaders = headerMatch[1].split('|').map((h) => h.trim());
      const nonEmptyHeaderCount = rawHeaders.filter((h) => h.length > 0).length;
      if (nonEmptyHeaderCount === 0) {
        i++;
        continue;
      }

      let activeHeaders = [...rawHeaders];

      // Use first table found
      if (headers.length === 0) {
        headers.push(...activeHeaders);
      }

      i += 2; // skip header + separator

      const potentialSubheaderMatch = i < lines.length ? TABLE_ROW_RE.exec(lines[i]) : null;
      if (potentialSubheaderMatch) {
        const potentialSubheaders = potentialSubheaderMatch[1].split('|').map((h) => h.trim());
        if (
          potentialSubheaders.length >= Math.min(2, activeHeaders.length)
          && isLikelyStackedHeaderRow(potentialSubheaders)
        ) {
          activeHeaders = flattenStackedHeaders(activeHeaders, potentialSubheaders);
          if (headers.length > 0) {
            headers.splice(0, headers.length, ...activeHeaders);
          }
          i += 1;
        }
      }

      // Parse data rows
      while (i < lines.length) {
        const rowMatch = TABLE_ROW_RE.exec(lines[i]);
        if (!rowMatch) break;

        const cells = rowMatch[1].split('|').map((c) => c.trim());
        const row: Record<string, string> = {};
        for (let col = 0; col < activeHeaders.length; col++) {
          row[activeHeaders[col]] = cells[col] ?? '';
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
