/**
 * notification-core/infrastructure/resend/ResendEmailProvider.ts
 *
 * Concrete EmailProvider adapter backed by the Resend SDK.
 * This is the only file in notification-core that imports from 'resend'.
 */

import { Resend, type CreateEmailOptions } from 'resend';

import type { NotificationConfig } from '../../config/NotificationConfig.js';
import type { EmailProvider } from '../../domain/EmailProvider.js';
import {
  NotificationErrorCode,
  createNotificationError,
  type EmailAddress,
  type SendEmailInput,
  type SendEmailResult,
} from '../../domain/types.js';

/**
 * Normalizes an EmailAddress (string | { name; email }) to the format
 * expected by the Resend SDK ("email" or "Name <email>").
 */
function formatAddress(address: EmailAddress): string {
  if (typeof address === 'string') {
    return address;
  }
  return `${address.name} <${address.email}>`;
}

function formatAddresses(
  value: EmailAddress | EmailAddress[] | undefined,
): string | string[] | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value.map(formatAddress);
  return formatAddress(value);
}

/**
 * ResendEmailProvider delegates email delivery to the Resend API.
 * Construct it with a loaded NotificationConfig so the API key is
 * read from the server environment — never from client-side code.
 */
export class ResendEmailProvider implements EmailProvider {
  private readonly client: Resend;
  private readonly config: NotificationConfig;

  constructor(config: NotificationConfig) {
    if (!config.resendApiKey) {
      throw new Error(
        '[ResendEmailProvider] Cannot instantiate provider without a RESEND_API_KEY.',
      );
    }
    this.config = config;
    this.client = new Resend(config.resendApiKey);
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    try {
      const from = input.from ?? this.config.emailFrom;
      const replyTo = input.replyTo ?? this.config.emailReplyTo;

      const { data, error } = await this.client.emails.send({
        from,
        to: formatAddresses(input.to) as string | string[],
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo,
        cc: formatAddresses(input.cc),
        bcc: formatAddresses(input.bcc),
      } as CreateEmailOptions);

      if (error !== null && error !== undefined) {
        return {
          success: false,
          error: createNotificationError(
            NotificationErrorCode.PROVIDER_ERROR,
            error.message,
            { name: error.name },
          ),
        };
      }

      return {
        success: true,
        messageId: data?.id ?? '',
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: createNotificationError(
          NotificationErrorCode.PROVIDER_ERROR,
          `Resend SDK threw an unexpected error: ${message}`,
          err,
        ),
      };
    }
  }
}
