import { analyzeStructure } from '../core/document-intelligence/structureAnalyzer';

describe('structureAnalyzer', () => {
  describe('analyzeStructure — table detection', () => {
    it('detects a standard markdown table', () => {
      const markdown = [
        '| Name | Email | Phone |',
        '| --- | --- | --- |',
        '| Alice | alice@test.com | 555-0001 |',
        '| Bob | bob@test.com | 555-0002 |',
      ].join('\n');

      const result = analyzeStructure(markdown, markdown);
      expect(result.structure).toBe('table');
      expect(result.detectedHeaders).toEqual(['Name', 'Email', 'Phone']);
      expect(result.rawRows).toHaveLength(2);
      expect(result.rawRows[0]).toEqual({ Name: 'Alice', Email: 'alice@test.com', Phone: '555-0001' });
      expect(result.rawRows[1]).toEqual({ Name: 'Bob', Email: 'bob@test.com', Phone: '555-0002' });
    });

    it('detects a sign-in sheet table with extra columns', () => {
      const markdown = [
        '| Name | Organization | Email | Phone | Screening | Share Info |',
        '| --- | --- | --- | --- | --- | --- |',
        '| Lydam McCullough | NLSM | LMcCullough@wcnls.org | 313-719-0973 | | |',
        '| Blake Lindsey | VAAC | BlakeLindsey1990@gmail.com | 586-625-0810 | | |',
      ].join('\n');

      const result = analyzeStructure(markdown, markdown);
      expect(result.structure).toBe('table');
      expect(result.detectedHeaders).toHaveLength(6);
      expect(result.rawRows).toHaveLength(2);
      expect(result.rawRows[0]['Organization']).toBe('NLSM');
    });

    it('preserves all rows from a multi-row table', () => {
      const rows: string[] = [];
      for (let i = 0; i < 15; i++) {
        rows.push(`| Person ${i} | person${i}@test.com | 555-000${i} |`);
      }
      const markdown = [
        '| Attendee | Contact Email | Phone Number |',
        '| --- | --- | --- |',
        ...rows,
      ].join('\n');

      const result = analyzeStructure(markdown, markdown);
      expect(result.structure).toBe('table');
      expect(result.rawRows).toHaveLength(15);
    });

    it('skips completely empty rows', () => {
      const markdown = [
        '| Name | Email |',
        '| --- | --- |',
        '| Alice | alice@test.com |',
        '| | |',
        '| Bob | bob@test.com |',
      ].join('\n');

      const result = analyzeStructure(markdown, markdown);
      expect(result.rawRows).toHaveLength(2);
    });
  });

  describe('analyzeStructure — single entity detection', () => {
    it('detects label:value pairs from card-like text', () => {
      const text = [
        'Name: John Doe',
        'Company: Acme Corp',
        'Email: john@acme.com',
        'Phone: 555-123-4567',
      ].join('\n');

      const result = analyzeStructure(text, '');
      expect(result.structure).toBe('single-entity');
      expect(result.detectedHeaders).toEqual(['Name', 'Company', 'Email', 'Phone']);
      expect(result.rawRows[0]['Name']).toBe('John Doe');
    });
  });

  describe('analyzeStructure — unstructured fallback', () => {
    it('returns unstructured for plain text without tables or labels', () => {
      const text = 'This is just a paragraph of text with no structure.';
      const result = analyzeStructure(text, '');
      expect(result.structure).toBe('unstructured');
      expect(result.detectedHeaders).toHaveLength(0);
      expect(result.rawRows).toHaveLength(0);
    });
  });
});
