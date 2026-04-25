/**
 * notification-core/application/SendEmailUseCase.ts
 *
 * Orchestrates outbound email delivery without binding to a specific provider,
 * framework, or transport.
 */

import type { NotificationConfig } from '../config/NotificationConfig.js';
import type { EmailLogger } from '../domain/EmailLogger.js';
import type { EmailProvider } from '../domain/EmailProvider.js';
import {
  NotificationErrorCode,
  createNotificationError,
  type SendEmailInput,
  type SendEmailResult,
} from '../domain/types.js';

export interface SendEmailUseCaseDependencies {
  provider: EmailProvider;
  config: NotificationConfig;
  logger?: EmailLogger;
  now?: () => Date;
}

/**
 * SendEmailUseCase coordinates the full email-send workflow:
 *  1. Checks whether sending is enabled; returns a skipped result if not.
 *  2. Validates that a provider API key is present.
 *  3. Delegates to the injected EmailProvider.
 *  4. Emits structured log events via the optional EmailLogger.
 */
export class SendEmailUseCase {
  private readonly provider: EmailProvider;
  private readonly config: NotificationConfig;
  private readonly logger: EmailLogger | undefined;
  private readonly now: () => Date;

  constructor(deps: SendEmailUseCaseDependencies) {
    this.provider = deps.provider;
    this.config = deps.config;
    this.logger = deps.logger;
    this.now = deps.now ?? (() => new Date());
  }

  async execute(input: SendEmailInput): Promise<SendEmailResult> {
    const occurredAt = this.now();

    // ------------------------------------------------------------------
    // Guard: sending disabled
    // ------------------------------------------------------------------
    if (!this.config.sendEnabled) {
      const result: SendEmailResult = {
        success: false,
        skipped: true,
        reason:
          'Email sending is disabled (EMAIL_SEND_ENABLED=false). ' +
          'Set EMAIL_SEND_ENABLED=true to enable delivery.',
      };

      this.logger?.log({
        action: 'notification.email.skipped',
        level: 'info',
        occurredAt,
        input: this.stripBody(input),
        result,
        message: 'Email send skipped: sending is disabled.',
      });

      return result;
    }

    // ------------------------------------------------------------------
    // Guard: missing API key (defensive — loadNotificationConfig already
    // validates this, but guard here for programmatic construction paths)
    // ------------------------------------------------------------------
    if (!this.config.resendApiKey) {
      const error = createNotificationError(
        NotificationErrorCode.MISSING_API_KEY,
        'RESEND_API_KEY is not configured. Cannot send email.',
      );
      const result: SendEmailResult = { success: false, error };

      this.logger?.log({
        action: 'notification.email.failed',
        level: 'error',
        occurredAt,
        input: this.stripBody(input),
        result,
        message: 'Email send failed: missing API key.',
      });

      return result;
    }

    // ------------------------------------------------------------------
    // Delegate to provider
    // ------------------------------------------------------------------
    this.logger?.log({
      action: 'notification.email.sending',
      level: 'debug',
      occurredAt,
      input: this.stripBody(input),
      message: 'Sending email via provider.',
    });

    const result = await this.provider.send(input);

    this.logger?.log({
      action: result.success ? 'notification.email.sent' : 'notification.email.failed',
      level: result.success ? 'info' : 'error',
      occurredAt: this.now(),
      input: this.stripBody(input),
      result,
      message: result.success ? 'Email sent successfully.' : 'Email send failed.',
    });

    return result;
  }

  /** Strip html/text bodies before logging to avoid large payloads in logs. */
  private stripBody(
    input: SendEmailInput,
  ): Omit<SendEmailInput, 'html' | 'text'> {
    const { html: _html, text: _text, ...rest } = input;
    return rest;
  }
}
