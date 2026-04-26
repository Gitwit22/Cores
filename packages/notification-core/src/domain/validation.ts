/**
 * notification-core/domain/validation.ts
 *
 * Basic email address validation utilities.
 * These checks are intentionally lightweight — they catch obviously malformed
 * addresses without introducing complex regex or external libraries.
 * Deep RFC-5321 validation is delegated to the email provider (Resend).
 */

import {
  NotificationErrorCode,
  createNotificationError,
  type EmailAddress,
  type NotificationError,
  type SendEmailInput,
} from './types.js';

// ---------------------------------------------------------------------------
// Single-address validation
// ---------------------------------------------------------------------------

/**
 * Returns true when `value` looks like a plausible email address:
 *  - Has exactly one "@" sign
 *  - Local part (before @) is non-empty
 *  - Domain part (after @) contains at least one "." and non-empty segments
 *
 * Deliberately permissive — edge cases are caught by the Resend API.
 */
export function isValidEmailAddress(value: string): boolean {
  const atIndex = value.indexOf('@');
  if (atIndex <= 0) return false; // no "@" or "@" at position 0
  if (atIndex !== value.lastIndexOf('@')) return false; // multiple "@"

  const domain = value.slice(atIndex + 1);
  if (!domain) return false;

  const dotIndex = domain.lastIndexOf('.');
  if (dotIndex <= 0) return false; // no "." or "." at start of domain
  if (dotIndex === domain.length - 1) return false; // trailing "."

  return true;
}

// ---------------------------------------------------------------------------
// Address normalisation helper
// ---------------------------------------------------------------------------

function extractEmail(address: EmailAddress): string {
  return typeof address === 'string' ? address : address.email;
}

function toArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

/**
 * Validates the recipient fields (`to`, `cc`, `bcc`) of a `SendEmailInput`.
 *
 * Returns `undefined` when all addresses are valid, or a `NotificationError`
 * with code `INVALID_INPUT` describing the first invalid address found.
 */
export function validateSendEmailInput(
  input: SendEmailInput,
): NotificationError | undefined {
  const fieldsToCheck: Array<{
    field: string;
    value: EmailAddress | EmailAddress[] | undefined;
  }> = [
    { field: 'to', value: input.to },
    { field: 'cc', value: input.cc },
    { field: 'bcc', value: input.bcc },
  ];

  for (const { field, value } of fieldsToCheck) {
    if (value === undefined) continue;

    for (const address of toArray(value)) {
      const email = extractEmail(address);
      if (!isValidEmailAddress(email)) {
        return createNotificationError(
          NotificationErrorCode.INVALID_INPUT,
          `Invalid email address in "${field}": "${email}"`,
          { field, value: email },
        );
      }
    }
  }

  if (!input.html && !input.text) {
    return createNotificationError(
      NotificationErrorCode.INVALID_INPUT,
      'At least one of "html" or "text" must be provided.',
    );
  }

  return undefined;
}
