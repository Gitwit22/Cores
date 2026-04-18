import {
  normalizeSigninHeader,
  normalizeCardLabel,
  buildSigninHeaderMap,
  buildCardLabelMap,
} from '../core/document-intelligence/headerNormalizer';

describe('headerNormalizer', () => {
  describe('normalizeSigninHeader', () => {
    it.each([
      ['Name', 'fullName'],
      ['Full Name', 'fullName'],
      ['full name', 'fullName'],
      ['Attendee', 'fullName'],
      ['Participant', 'fullName'],
      ['Organization', 'organization'],
      ['Org', 'organization'],
      ['Company', 'organization'],
      ['Affiliation', 'organization'],
      ['Email', 'email'],
      ['E-mail', 'email'],
      ['Contact Email', 'email'],
      ['Phone', 'phone'],
      ['Phone Number', 'phone'],
      ['Mobile', 'phone'],
      ['Telephone', 'phone'],
      ['Screening', 'screening'],
      ['Screened', 'screening'],
      ['Share Info', 'shareInfo'],
      ['Share Information', 'shareInfo'],
      ['Consent to Share', 'shareInfo'],
      ['Date', 'date'],
      ['Event Date', 'date'],
      ['Comments', 'comments'],
      ['Notes', 'comments'],
      ['Remarks', 'comments'],
    ])('maps "%s" to "%s"', (header, expected) => {
      expect(normalizeSigninHeader(header)).toBe(expected);
    });

    it('returns null for unknown headers', () => {
      expect(normalizeSigninHeader('Check for Yes')).toBeNull();
      expect(normalizeSigninHeader('Badge Number')).toBeNull();
      expect(normalizeSigninHeader('Random Column')).toBeNull();
    });
  });

  describe('normalizeCardLabel', () => {
    it.each([
      ['Name', 'fullName'],
      ['First Name', 'firstName'],
      ['Last Name', 'lastName'],
      ['Surname', 'lastName'],
      ['Company', 'company'],
      ['Organization', 'company'],
      ['Title', 'title'],
      ['Job Title', 'title'],
      ['Role', 'title'],
      ['Email', 'email'],
      ['Phone', 'phone'],
      ['Mobile', 'phone'],
      ['Website', 'website'],
      ['URL', 'website'],
      ['Address', 'address'],
      ['LinkedIn', 'social'],
      ['Twitter', 'social'],
    ])('maps "%s" to "%s"', (label, expected) => {
      expect(normalizeCardLabel(label)).toBe(expected);
    });
  });

  describe('buildSigninHeaderMap', () => {
    it('maps standard sign-in headers', () => {
      const headers = ['Name', 'Organization', 'Email', 'Phone', 'Screening', 'Share Info'];
      const result = buildSigninHeaderMap(headers);
      expect(result).toEqual([
        { original: 'Name', normalized: 'fullName' },
        { original: 'Organization', normalized: 'organization' },
        { original: 'Email', normalized: 'email' },
        { original: 'Phone', normalized: 'phone' },
        { original: 'Screening', normalized: 'screening' },
        { original: 'Share Info', normalized: 'shareInfo' },
      ]);
    });

    it('maps renamed/non-standard headers with unmapped extras', () => {
      const headers = ['Attendee', 'Agency', 'E-mail', 'Badge Number'];
      const result = buildSigninHeaderMap(headers);
      expect(result[0].normalized).toBe('fullName');
      expect(result[1].normalized).toBe('organization');
      expect(result[2].normalized).toBe('email');
      expect(result[3].normalized).toBeNull();
    });
  });

  describe('buildCardLabelMap', () => {
    it('maps standard business card labels', () => {
      const labels = ['First Name', 'Last Name', 'Company', 'Title', 'Phone', 'Email'];
      const result = buildCardLabelMap(labels);
      expect(result.every((m) => m.normalized !== null)).toBe(true);
    });

    it('handles unusual labels', () => {
      const labels = ['Given Name', 'Firm', 'Designation'];
      const result = buildCardLabelMap(labels);
      expect(result[0].normalized).toBe('firstName');
      expect(result[1].normalized).toBe('company');
      expect(result[2].normalized).toBe('title');
    });
  });
});
