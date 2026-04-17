import { extractSigninSheet, extractBusinessCard } from '../core/document-intelligence/dynamicExtractor';
import type { NormalizedParseResult } from '../core/document-intelligence/types';

function makeParse(text: string, markdown?: string): NormalizedParseResult {
  return {
    provider: 'llama-cloud',
    status: 'complete',
    text,
    markdown: markdown ?? text,
    confidence: 1,
  };
}

describe('dynamicExtractor', () => {
  // ── Sign-in sheet ──────────────────────────────────────────────────────────

  describe('extractSigninSheet', () => {
    it('extracts all rows from a standard sign-in table', () => {
      const markdown = [
        '| Name | Organization | Email | Phone |',
        '| --- | --- | --- | --- |',
        '| Alice Smith | NLSM | alice@test.com | 555-0001 |',
        '| Bob Jones | VAAC | bob@test.com | 555-0002 |',
        '| Carol White | NAACP | carol@test.com | 555-0003 |',
      ].join('\n');

      const result = extractSigninSheet(makeParse(markdown));
      expect(result.status).toBe('complete');
      expect(result.structure).toBe('table');
      expect(result.normalizedRows).toHaveLength(3);
      expect(result.normalizedRows[0].fullName).toBe('Alice Smith');
      expect(result.normalizedRows[0].organization).toBe('NLSM');
      expect(result.normalizedRows[0].email).toBe('alice@test.com');
      expect(result.normalizedRows[2].fullName).toBe('Carol White');
    });

    it('normalizes renamed/variant headers', () => {
      const markdown = [
        '| Attendee | Agency | E-mail | Telephone |',
        '| --- | --- | --- | --- |',
        '| Jane Doe | EPA | jane@gov.org | 202-555-0100 |',
      ].join('\n');

      const result = extractSigninSheet(makeParse(markdown));
      expect(result.normalizedRows).toHaveLength(1);
      expect(result.normalizedRows[0].fullName).toBe('Jane Doe');
      expect(result.normalizedRows[0].organization).toBe('EPA');
      expect(result.normalizedRows[0].email).toBe('jane@gov.org');
      expect(result.normalizedRows[0].phone).toBe('202-555-0100');
    });

    it('preserves unknown columns in extraFields', () => {
      const markdown = [
        '| Name | Email | Badge Number | Meal Preference |',
        '| --- | --- | --- | --- |',
        '| Alice | alice@test.com | 1234 | Vegetarian |',
      ].join('\n');

      const result = extractSigninSheet(makeParse(markdown));
      expect(result.normalizedRows[0].fullName).toBe('Alice');
      expect(result.normalizedRows[0].email).toBe('alice@test.com');
      expect(result.normalizedRows[0].extraFields['Badge Number']).toBe('1234');
      expect(result.normalizedRows[0].extraFields['Meal Preference']).toBe('Vegetarian');
    });

    it('detects screening and share info columns', () => {
      const markdown = [
        '| Name | Email | Phone | Screening | Share Info |',
        '| --- | --- | --- | --- | --- |',
        '| Alice | alice@test.com | 555-0001 | Yes | Yes |',
      ].join('\n');

      const result = extractSigninSheet(makeParse(markdown));
      expect(result.normalizedRows[0].screening).toBe('Yes');
      expect(result.normalizedRows[0].shareInfo).toBe('Yes');
    });

    it('does not collapse a multi-row table into one entry', () => {
      const rows: string[] = [];
      for (let i = 0; i < 10; i++) {
        rows.push(`| Person ${i} | person${i}@test.com |`);
      }
      const markdown = [
        '| Name | Email |',
        '| --- | --- |',
        ...rows,
      ].join('\n');

      const result = extractSigninSheet(makeParse(markdown));
      expect(result.normalizedRows).toHaveLength(10);
    });

    it('returns detectedHeaders and headerMapping', () => {
      const markdown = [
        '| Participant | Org | Phone |',
        '| --- | --- | --- |',
        '| Alice | NLSM | 555-0001 |',
      ].join('\n');

      const result = extractSigninSheet(makeParse(markdown));
      expect(result.detectedHeaders).toEqual(['Participant', 'Org', 'Phone']);
      expect(result.headerMapping).toEqual([
        { original: 'Participant', normalized: 'fullName' },
        { original: 'Org', normalized: 'organization' },
        { original: 'Phone', normalized: 'phone' },
      ]);
    });

    it('falls back to text extraction when no table is found', () => {
      const text = 'Contact alice@test.com at 555-0001 or bob@test.com at 555-0002';
      const result = extractSigninSheet(makeParse(text, ''));
      expect(result.structure).toBe('unstructured');
      expect(result.normalizedRows.length).toBeGreaterThan(0);
    });
  });

  // ── Business card ──────────────────────────────────────────────────────────

  describe('extractBusinessCard', () => {
    it('extracts from label:value format', () => {
      const text = [
        'Name: John Doe',
        'Company: Acme Corp',
        'Title: VP Engineering',
        'Email: john@acme.com',
        'Phone: 555-123-4567',
        'Website: www.acme.com',
      ].join('\n');

      const result = extractBusinessCard(makeParse(text, ''));
      expect(result.status).toBe('complete');
      expect(result.card.fullName).toBe('John Doe');
      expect(result.card.company).toBe('Acme Corp');
      expect(result.card.title).toBe('VP Engineering');
      expect(result.card.email).toBe('john@acme.com');
    });

    it('infers fields from content patterns when no labels exist', () => {
      const text = [
        'John Doe',
        'Acme Corporation',
        'john.doe@acme.com',
        '(555) 123-4567',
        'www.acme.com',
      ].join('\n');

      const result = extractBusinessCard(makeParse(text, ''));
      expect(result.card.email).toBe('john.doe@acme.com');
      expect(result.card.phone).toContain('555');
      expect(result.card.website).toContain('acme.com');
    });

    it('handles multiple phones and emails', () => {
      const text = [
        'Name: Jane Smith',
        'Office: 555-111-2222',
        'Mobile: 555-333-4444',
        'jane@work.com',
        'jane.personal@gmail.com',
      ].join('\n');

      const result = extractBusinessCard(makeParse(text, ''));
      // Primary fields should be populated
      expect(result.card.email).toBeTruthy();
      expect(result.card.phone).toBeTruthy();
      // Extra should capture additional values
      const extraValues = Object.values(result.card.extraFields).join(', ');
      const allContact = [result.card.email, result.card.phone, extraValues].join(' ');
      // At least captures both phones somewhere (primary + extra)
      expect(allContact).toContain('555');
    });

    it('preserves unknown labels in extraFields', () => {
      const text = [
        'Name: Alice',
        'Email: alice@test.com',
        'Department: Sales',
        'Badge: 12345',
      ].join('\n');

      const result = extractBusinessCard(makeParse(text, ''));
      expect(result.card.fullName).toBe('Alice');
      expect(result.card.extraFields['Department']).toBe('Sales');
      expect(result.card.extraFields['Badge']).toBe('12345');
    });

    it('preserves rawText', () => {
      const text = 'John Doe\njohn@test.com';
      const result = extractBusinessCard(makeParse(text, ''));
      expect(result.card.rawText).toBe(text);
    });

    it('handles social handles', () => {
      const text = [
        'Name: John Doe',
        'Email: john@test.com',
        '@johndoe_official',
      ].join('\n');

      const result = extractBusinessCard(makeParse(text, ''));
      expect(result.card.social).toContain('@johndoe_official');
    });

    it('returns failed status for empty input', () => {
      const result = extractBusinessCard(makeParse('', ''));
      expect(result.status).toBe('failed');
    });
  });
});
