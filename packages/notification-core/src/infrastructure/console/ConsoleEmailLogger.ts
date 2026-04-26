/**
 * notification-core/infrastructure/console/ConsoleEmailLogger.ts
 *
 * A concrete EmailLogger adapter that writes structured notification events to
 * the Node.js console. Suitable for development, testing, and server-side
 * diagnostic output in production environments that capture stdout/stderr.
 *
 * Level mapping:
 *   debug  → console.debug
 *   info   → console.info
 *   warn   → console.warn
 *   error  → console.error
 */

import type { EmailLogger, NotificationLogEvent } from '../../domain/EmailLogger.js';
import type { NotificationConfig } from '../../config/NotificationConfig.js';

/**
 * Log-level numeric ordering used to filter events below the configured
 * minimum level.
 */
const LOG_LEVEL_ORDER: Record<NotificationConfig['logLevel'], number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * ConsoleEmailLogger writes notification events to the Node.js console.
 *
 * Usage:
 * ```ts
 * const logger = new ConsoleEmailLogger('info');
 * const useCase = new SendEmailUseCase({ provider, config, logger });
 * ```
 */
export class ConsoleEmailLogger implements EmailLogger {
  private readonly minLevel: number;

  /**
   * @param logLevel - Minimum log level to emit. Events below this level are
   *   silently dropped. Defaults to `'info'`.
   */
  constructor(logLevel: NotificationConfig['logLevel'] = 'info') {
    this.minLevel = LOG_LEVEL_ORDER[logLevel];
  }

  log(event: NotificationLogEvent): void {
    if (LOG_LEVEL_ORDER[event.level] < this.minLevel) return;

    const payload = {
      action: event.action,
      occurredAt: event.occurredAt.toISOString(),
      message: event.message,
      to: event.input.to,
      subject: event.input.subject,
      programDomain: event.input.programDomain,
      organizationId: event.input.organizationId,
      userId: event.input.userId,
      ...(event.details ? { details: event.details } : {}),
      ...(event.result && !event.result.success && 'error' in event.result
        ? { error: event.result.error }
        : {}),
    };

    switch (event.level) {
      case 'debug':
        console.debug('[notification-core]', JSON.stringify(payload));
        break;
      case 'info':
        console.info('[notification-core]', JSON.stringify(payload));
        break;
      case 'warn':
        console.warn('[notification-core]', JSON.stringify(payload));
        break;
      case 'error':
        console.error('[notification-core]', JSON.stringify(payload));
        break;
    }
  }
}
