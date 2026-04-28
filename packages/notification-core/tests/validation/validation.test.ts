import {
  isValidEmailAddress,
  validateSendEmailInput,
  NotificationErrorCode,
  type SendEmailInput,
} from '../../src/index';

// ---------------------------------------------------------------------------
// isValidEmailAddress
// ---------------------------------------------------------------------------

describe('isValidEmailAddress', () => {
  it.each([
    'user@example.com',
    'first.last@sub.domain.org',
    'user+tag@example.io',
    'a@b.co',
  ])('returns true for valid address: %s', (email) => {
    expect(isValidEmailAddress(email)).toBe(true);
  });

  it.each([
    '',
    'notanemail',
    '@nodomain.com',
    'noatsign',
    'double@@sign.com',
    'missing@dot',
    'trailing@dot.',
    'user@',
  ])('returns false for invalid address: %s', (email) => {
    expect(isValidEmailAddress(email)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateSendEmailInput
// ---------------------------------------------------------------------------

const validInput: SendEmailInput = {
  to: 'user@example.com',
  subject: 'Hello',
  html: '<p>Hello</p>',
};

describe('validateSendEmailInput', () => {
  it('returns undefined for a fully valid input', () => {
    expect(validateSendEmailInput(validInput)).toBeUndefined();
  });

  it('returns an INVALID_INPUT error when "to" is an invalid address', () => {
    const error = validateSendEmailInput({ ...validInput, to: 'not-an-email' });
    expect(error).toBeDefined();
    expect(error?.code).toBe(NotificationErrorCode.INVALID_INPUT);
    expect(error?.message).toMatch(/"to"/);
  });

  it('returns an INVALID_INPUT error when one of multiple "to" addresses is invalid', () => {
    const error = validateSendEmailInput({
      ...validInput,
      to: ['good@example.com', 'bad-address'],
    });
    expect(error).toBeDefined();
    expect(error?.code).toBe(NotificationErrorCode.INVALID_INPUT);
  });

  it('returns an INVALID_INPUT error for an invalid named address in "to"', () => {
    const error = validateSendEmailInput({
      ...validInput,
      to: { name: 'Alice', email: 'not-valid' },
    });
    expect(error).toBeDefined();
    expect(error?.code).toBe(NotificationErrorCode.INVALID_INPUT);
  });

  it('returns an INVALID_INPUT error when "cc" contains an invalid address', () => {
    const error = validateSendEmailInput({
      ...validInput,
      cc: 'bad-cc',
    });
    expect(error).toBeDefined();
    expect(error?.message).toMatch(/"cc"/);
  });

  it('returns an INVALID_INPUT error when "bcc" contains an invalid address', () => {
    const error = validateSendEmailInput({
      ...validInput,
      bcc: 'bad-bcc',
    });
    expect(error).toBeDefined();
    expect(error?.message).toMatch(/"bcc"/);
  });

  it('returns an INVALID_INPUT error when neither html nor text is provided', () => {
    const { html: _html, ...inputWithoutBody } = validInput;
    const error = validateSendEmailInput(inputWithoutBody);
    expect(error).toBeDefined();
    expect(error?.code).toBe(NotificationErrorCode.INVALID_INPUT);
    expect(error?.message).toMatch(/html.*text/i);
  });

  it('accepts text-only input (no html)', () => {
    const error = validateSendEmailInput({
      to: 'user@example.com',
      subject: 'Hello',
      text: 'Plain text body',
    });
    expect(error).toBeUndefined();
  });

  it('accepts valid cc and bcc alongside valid to', () => {
    const error = validateSendEmailInput({
      ...validInput,
      cc: 'cc@example.com',
      bcc: ['bcc1@example.com', 'bcc2@example.com'],
    });
    expect(error).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Integration: SendEmailUseCase rejects invalid input before calling provider
// ---------------------------------------------------------------------------

import {
  SendEmailUseCase,
  type NotificationConfig,
  type EmailProvider,
  type SendEmailResult,
} from '../../src/index';

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

describe('SendEmailUseCase — input validation integration', () => {
  it('returns INVALID_INPUT error and does not call provider for a bad address', async () => {
    const config = makeConfig();
    const { provider, sendMock } = makeProvider({ success: true, messageId: 'msg-1' });
    const useCase = new SendEmailUseCase({ provider, config });

    const result = await useCase.execute({
      to: 'not-an-email',
      subject: 'Test',
      html: '<p>Test</p>',
    });

    expect(result.success).toBe(false);
    if (!result.success && 'error' in result) {
      expect(result.error.code).toBe(NotificationErrorCode.INVALID_INPUT);
    }
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('proceeds to provider when input is valid', async () => {
    const config = makeConfig();
    const { provider, sendMock } = makeProvider({ success: true, messageId: 'msg-ok' });
    const useCase = new SendEmailUseCase({ provider, config });

    const result = await useCase.execute({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
    });

    expect(result.success).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });
});
