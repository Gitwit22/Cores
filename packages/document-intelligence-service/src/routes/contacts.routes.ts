import { Router } from 'express';
import { validateContacts, normalizeContacts, dedupeContacts } from '../utils/contactUtils.js';
import type { ContactRecord } from '../utils/contactUtils.js';

const contactsRouter = Router();

function parseRows(req: { body: unknown }): ContactRecord[] {
  const body = req.body as Record<string, unknown> | undefined;
  const rows = body?.rows;
  if (!Array.isArray(rows)) return [];
  return rows as ContactRecord[];
}

// POST /validate/contacts  body: { rows: ContactRecord[] }
contactsRouter.post('/validate/contacts', (req, res) => {
  const rows = parseRows(req);
  const results = validateContacts(rows);
  const validCount = results.filter((r) => r.valid).length;
  res.json({
    total: results.length,
    valid: validCount,
    invalid: results.length - validCount,
    results,
  });
});

// POST /normalize/contacts  body: { rows: ContactRecord[] }
contactsRouter.post('/normalize/contacts', (req, res) => {
  const rows = parseRows(req);
  const normalized = normalizeContacts(rows);
  res.json({ count: normalized.length, rows: normalized });
});

// POST /dedupe/contacts  body: { rows: ContactRecord[] }
contactsRouter.post('/dedupe/contacts', (req, res) => {
  const rows = parseRows(req);
  const result = dedupeContacts(rows);
  res.json({
    totalInput: rows.length,
    uniqueCount: result.unique.length,
    duplicateCount: result.duplicates.length,
    unique: result.unique,
    duplicates: result.duplicates,
  });
});

export { contactsRouter };
