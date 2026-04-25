import {
  SendEmailUseCase,
  type NotificationConfig,
  type EmailProvider,
  type SendEmailResult,
  type SendEmailInput,
  NotificationErrorCode,
} from '../../src/index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<NotificationConfig> = {}): NotificationConfig {
  return {
    resendApiKey: 'test-api-key',
    emailFrom: 'no-reply@example.com',
    emailReplyTo: undefined,
    emailProvider: 'resend',
    sendEnabled: true,
    logLevel: 'info',
    ...overrides,
  };
}

function makeProvider(result: SendEmailResult): { provider: EmailProvider; sendMock: jest.Mock } {
  const sendMock = jest.fn<Promise<SendEmailResult>, [SendEmailInput]>().mockResolvedValue(result);
  return { provider: { send: sendMock }, sendMock };
}

const baseInput: SendEmailInput = {
  to: 'user@example.com',
  subject: 'Hello',
  html: '<p>Hello</p>',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SendEmailUseCase', () => {
  it('returns a skipped result when sendEnabled is false', async () => {
    const config = makeConfig({ sendEnabled: false });
    const { provider, sendMock } = makeProvider({ success: true, messageId: 'msg-1' });
    const useCase = new SendEmailUseCase({ provider, config });

    const result = await useCase.execute(baseInput);

    expect(result.success).toBe(false);
    expect('skipped' in result && result.skipped).toBe(true);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('returns an error result when resendApiKey is missing and sendEnabled is true', async () => {
    const config = makeConfig({ resendApiKey: undefined });
    const { provider, sendMock } = makeProvider({ success: true, messageId: 'msg-1' });
    const useCase = new SendEmailUseCase({ provider, config });

    const result = await useCase.execute(baseInput);

    expect(result.success).toBe(false);
    expect('error' in result && !('skipped' in result)).toBe(true);
    if (!result.success && !('skipped' in result)) {
      expect(result.error.code).toBe(NotificationErrorCode.MISSING_API_KEY);
    }
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('delegates to the provider and returns success when configured correctly', async () => {
    const config = makeConfig();
    const { provider, sendMock } = makeProvider({ success: true, messageId: 'msg-123' });
    const useCase = new SendEmailUseCase({ provider, config });

    const result = await useCase.execute(baseInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.messageId).toBe('msg-123');
    }
    expect(sendMock).toHaveBeenCalledWith(baseInput);
  });

  it('forwards a provider failure result to the caller', async () => {
    const config = makeConfig();
    const failureResult: SendEmailResult = {
      success: false,
      error: {
        code: NotificationErrorCode.PROVIDER_ERROR,
        message: 'API rate limit exceeded',
      },
    };
    const { provider } = makeProvider(failureResult);
    const useCase = new SendEmailUseCase({ provider, config });

    const result = await useCase.execute(baseInput);

    expect(result.success).toBe(false);
    if (!result.success && 'error' in result) {
      expect(result.error.code).toBe(NotificationErrorCode.PROVIDER_ERROR);
    }
  });

  it('calls the logger when one is injected', async () => {
    const config = makeConfig();
    const { provider } = makeProvider({ success: true, messageId: 'msg-456' });
    const logSpy = jest.fn();
    const logger = { log: logSpy };
    const useCase = new SendEmailUseCase({ provider, config, logger });

    await useCase.execute(baseInput);

    expect(logSpy).toHaveBeenCalledTimes(2);
    const [firstCall] = logSpy.mock.calls as [{ action: string }][];
    const secondCall = (logSpy.mock.calls as [{ action: string }][])[1];
    expect(firstCall[0].action).toBe('notification.email.sending');
    expect(secondCall[0].action).toBe('notification.email.sent');
  });
});
