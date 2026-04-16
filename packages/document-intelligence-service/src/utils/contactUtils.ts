/**
 * Shared contact normalization, validation, and deduplication utilities.
 */

export interface ContactRecord {
  id?: string;
  [key: string]: unknown;
}

// ── Normalization ──────────────────────────────────────────────────────────────

function normalizeEmail(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().toLowerCase();
}

function normalizePhone(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return raw.trim();
}

function normalizeName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export function normalizeContacts(rows: ContactRecord[]): ContactRecord[] {
  return rows.map((row) => {
    const out: ContactRecord = { ...row };

    if (typeof out.email === 'string') out.email = normalizeEmail(out.email);
    if (typeof out.phone === 'string') out.phone = normalizePhone(out.phone);
    if (typeof out.fullName === 'string') out.fullName = normalizeName(out.fullName);
    if (typeof out.name === 'string') out.name = normalizeName(out.name);
    if (typeof out.firstName === 'string') out.firstName = normalizeName(out.firstName);
    if (typeof out.lastName === 'string') out.lastName = normalizeName(out.lastName);
    if (typeof out.company === 'string') out.company = out.company.trim();
    if (typeof out.title === 'string') out.title = out.title.trim();
    if (typeof out.website === 'string') out.website = out.website.trim().toLowerCase();

    // Auto-split fullName → firstName/lastName if firstName is missing
    if (out.fullName && !out.firstName) {
      const { firstName, lastName } = splitFullName(out.fullName as string);
      out.firstName = firstName;
      out.lastName = lastName;
    }

    return out;
  });
}

// ── Validation ─────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const PHONE_RE = /^\+?[\d\s().+-]{7,20}$/;

export interface ValidationResult {
  row: ContactRecord;
  valid: boolean;
  flags: string[];
}

export function validateContacts(rows: ContactRecord[]): ValidationResult[] {
  return rows.map((row) => {
    const flags: string[] = [];

    if (row.email && !EMAIL_RE.test(String(row.email))) {
      flags.push('invalid_email');
    }
    if (row.phone && !PHONE_RE.test(String(row.phone))) {
      flags.push('invalid_phone');
    }
    if (!row.email && !row.phone) {
      flags.push('no_contact_info');
    }
    if (!row.fullName && !row.name && !row.firstName) {
      flags.push('no_name');
    }

    return { row, valid: flags.length === 0, flags };
  });
}

// ── Deduplication ──────────────────────────────────────────────────────────────

function dedupKey(row: ContactRecord): string {
  const email = typeof row.email === 'string' ? row.email.toLowerCase().trim() : '';
  const phone = typeof row.phone === 'string' ? row.phone.replace(/\D/g, '') : '';
  const name = (
    typeof row.fullName === 'string' ? row.fullName :
    typeof row.name === 'string' ? row.name :
    `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim()
  ).toLowerCase().replace(/\s+/g, ' ').trim();
  return email || phone || name;
}

export interface DedupeResult {
  unique: ContactRecord[];
  duplicates: ContactRecord[];
}

export function dedupeContacts(rows: ContactRecord[]): DedupeResult {
  const seen = new Map<string, ContactRecord>();
  const duplicates: ContactRecord[] = [];

  for (const row of rows) {
    const key = dedupKey(row);
    if (!key) {
      seen.set(crypto.randomUUID(), row);
      continue;
    }
    if (seen.has(key)) {
      duplicates.push(row);
    } else {
      seen.set(key, row);
    }
  }

  return { unique: Array.from(seen.values()), duplicates };
}
