import { inferContentTypes, extractEmails, extractPhones, extractUrls } from '../core/document-intelligence/contentPatterns';

describe('contentPatterns', () => {
  describe('inferContentTypes', () => {
    it('detects email addresses', () => {
      const results = inferContentTypes('john@acme.com');
      expect(results.some((r) => r.type === 'email')).toBe(true);
    });

    it('detects phone numbers', () => {
      const results = inferContentTypes('(313) 719-0973');
      expect(results.some((r) => r.type === 'phone')).toBe(true);
    });

    it('detects US phone with +1 prefix', () => {
      const results = inferContentTypes('+1 555-123-4567');
      expect(results.some((r) => r.type === 'phone')).toBe(true);
    });

    it('detects website URLs', () => {
      const results = inferContentTypes('https://www.acme.com');
      expect(results.some((r) => r.type === 'website')).toBe(true);
    });

    it('detects www URLs without protocol', () => {
      const results = inferContentTypes('www.example.com');
      expect(results.some((r) => r.type === 'website')).toBe(true);
    });

    it('detects social handles', () => {
      const results = inferContentTypes('@johndoe');
      expect(results.some((r) => r.type === 'social')).toBe(true);
    });

    it('does not flag email as social handle', () => {
      const results = inferContentTypes('john@acme.com');
      expect(results.some((r) => r.type === 'social')).toBe(false);
    });

    it('detects dates', () => {
      const results = inferContentTypes('04/17/2026');
      expect(results.some((r) => r.type === 'date')).toBe(true);
    });

    it('detects addresses', () => {
      const results = inferContentTypes('123 Main St, Suite 200');
      expect(results.some((r) => r.type === 'address')).toBe(true);
    });

    it('returns empty for empty string', () => {
      expect(inferContentTypes('')).toHaveLength(0);
    });

    it('detects multiple types in one value', () => {
      // A value with both phone and date
      const results = inferContentTypes('Call 555-123-4567 after 01/15/2026');
      expect(results.some((r) => r.type === 'phone')).toBe(true);
      expect(results.some((r) => r.type === 'date')).toBe(true);
    });
  });

  describe('extractEmails', () => {
    it('extracts multiple emails', () => {
      const text = 'Contact alice@test.com or bob@test.com for info.';
      expect(extractEmails(text)).toEqual(['alice@test.com', 'bob@test.com']);
    });

    it('returns empty array for no emails', () => {
      expect(extractEmails('No emails here')).toEqual([]);
    });
  });

  describe('extractPhones', () => {
    it('extracts multiple phone numbers', () => {
      const text = 'Office: (555) 123-4567 Mobile: 555-987-6543';
      const phones = extractPhones(text);
      expect(phones).toHaveLength(2);
    });
  });

  describe('extractUrls', () => {
    it('extracts URLs', () => {
      const text = 'Visit https://example.com or www.other.org';
      const urls = extractUrls(text);
      expect(urls).toHaveLength(2);
    });
  });
});
