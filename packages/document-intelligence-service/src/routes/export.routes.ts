import { Router } from 'express';
import ExcelJS from 'exceljs';

const exportRouter = Router();

interface ContactRow {
  [key: string]: unknown;
}

function parseBody(req: { body: unknown }): ContactRow[] {
  const body = req.body as Record<string, unknown> | undefined;
  const rows = body?.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }
  return rows as ContactRow[];
}

// POST /export/xlsx  body: { rows: ContactRow[], filename?: string }
exportRouter.post('/export/xlsx', async (req, res, next) => {
  try {
    const rows = parseBody(req);
    const body = req.body as Record<string, unknown>;
    const filename = typeof body?.filename === 'string' ? body.filename : 'export.xlsx';

    const cleanRows = rows.map(({ _confidence, ...rest }) => rest);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Data');

    if (cleanRows.length > 0) {
      const headers = Object.keys(cleanRows[0]);
      ws.columns = headers.map((h) => ({ header: h, key: h, width: 20 }));
      for (const row of cleanRows) {
        ws.addRow(row);
      }
    }

    const buffer = await wb.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

// POST /export/json  body: { rows: ContactRow[] }
exportRouter.post('/export/json', (req, res) => {
  const rows = parseBody(req);
  const clean = rows.map(({ _confidence, ...rest }) => rest);
  res.json({ count: clean.length, rows: clean });
});

// POST /export/csv  body: { rows: ContactRow[], filename?: string }
exportRouter.post('/export/csv', (req, res) => {
  const rows = parseBody(req);
  const body = req.body as Record<string, unknown>;
  const filename = typeof body?.filename === 'string' ? body.filename : 'export.csv';

  if (rows.length === 0) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('');
    return;
  }

  const clean = rows.map(({ _confidence, ...rest }) => rest);
  const headers = Object.keys(clean[0]);
  const escape = (v: unknown): string => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(','),
    ...clean.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ].join('\r\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

// POST /export/md  body: { rows: ContactRow[] }
exportRouter.post('/export/md', (req, res) => {
  const rows = parseBody(req);
  if (rows.length === 0) {
    res.json({ markdown: '' });
    return;
  }
  const clean = rows.map(({ _confidence, ...rest }) => rest);
  const headers = Object.keys(clean[0]);
  const sep = headers.map(() => '---');
  const lines = [
    `| ${headers.join(' | ')} |`,
    `| ${sep.join(' | ')} |`,
    ...clean.map((row) => `| ${headers.map((h) => String(row[h] ?? '')).join(' | ')} |`),
  ];
  res.json({ markdown: lines.join('\n') });
});

export { exportRouter };
