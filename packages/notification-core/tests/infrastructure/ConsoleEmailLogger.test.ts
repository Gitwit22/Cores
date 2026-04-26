import { ConsoleEmailLogger, type NotificationLogEvent } from '../../src/index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(level: NotificationLogEvent['level'] = 'info'): NotificationLogEvent {
  return {
    action: 'notification.email.sent',
    level,
    occurredAt: new Date('2024-01-15T12:00:00Z'),
    input: {
      to: 'user@example.com',
      subject: 'Test Subject',
      programDomain: 'streamline',
    },
    message: 'Email sent successfully.',
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ConsoleEmailLogger', () => {
  let debugSpy: jest.SpyInstance;
  let infoSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => undefined);
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls console.info for an info-level event', () => {
    const logger = new ConsoleEmailLogger('info');
    logger.log(makeEvent('info'));
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(debugSpy).not.toHaveBeenCalled();
  });

  it('calls console.debug for a debug-level event when minLevel is debug', () => {
    const logger = new ConsoleEmailLogger('debug');
    logger.log(makeEvent('debug'));
    expect(debugSpy).toHaveBeenCalledTimes(1);
  });

  it('calls console.warn for a warn-level event', () => {
    const logger = new ConsoleEmailLogger('info');
    logger.log(makeEvent('warn'));
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('calls console.error for an error-level event', () => {
    const logger = new ConsoleEmailLogger('info');
    logger.log(makeEvent('error'));
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('suppresses debug events when minLevel is info', () => {
    const logger = new ConsoleEmailLogger('info');
    logger.log(makeEvent('debug'));
    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('suppresses info and debug events when minLevel is warn', () => {
    const logger = new ConsoleEmailLogger('warn');
    logger.log(makeEvent('debug'));
    logger.log(makeEvent('info'));
    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('defaults to info level when no logLevel is provided', () => {
    const logger = new ConsoleEmailLogger();
    logger.log(makeEvent('debug'));
    logger.log(makeEvent('info'));
    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledTimes(1);
  });

  it('includes action, occurredAt, message, and to in the logged payload', () => {
    const logger = new ConsoleEmailLogger('info');
    logger.log(makeEvent('info'));

    const [prefix, jsonStr] = infoSpy.mock.calls[0] as [string, string];
    expect(prefix).toBe('[notification-core]');
    const payload = JSON.parse(jsonStr) as Record<string, unknown>;
    expect(payload['action']).toBe('notification.email.sent');
    expect(payload['occurredAt']).toBe('2024-01-15T12:00:00.000Z');
    expect(payload['message']).toBe('Email sent successfully.');
    expect(payload['to']).toBe('user@example.com');
  });

  it('does not include html or text bodies in the log output', () => {
    const logger = new ConsoleEmailLogger('info');
    const eventWithBody: NotificationLogEvent = {
      ...makeEvent('info'),
      input: {
        to: 'user@example.com',
        subject: 'Test',
        // html and text are stripped by SendEmailUseCase before logging,
        // so they should never appear on the input passed to the logger
      },
    };
    logger.log(eventWithBody);
    const [, jsonStr] = infoSpy.mock.calls[0] as [string, string];
    expect(jsonStr).not.toContain('html');
    expect(jsonStr).not.toContain('text');
  });
});
