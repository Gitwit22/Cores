# @nxtlvl/notification-core

Reusable email notification service for Nxt Lvl applications, powered by [Resend](https://resend.com).

## Purpose

`notification-core` provides a shared, program-agnostic foundation for:

- Sending transactional emails via Resend
- Template rendering hooks (provider-agnostic)
- Input validation and error handling
- Structured logging via an injectable `EmailLogger`
- Safe skipping when sending is disabled (e.g. local development)

This package is intentionally decoupled from any specific program (StreamLine, Community Chronicle, Mission Ops) or frontend. Programs import and instantiate it in their own API layers.

## Package Layout

- `src/domain` — business-facing types and contracts (`SendEmailInput`, `EmailProvider`, `EmailLogger`)
- `src/config` — environment configuration loader (`loadNotificationConfig`)
- `src/application` — use-case orchestration (`SendEmailUseCase`)
- `src/infrastructure/resend` — concrete Resend SDK adapter (`ResendEmailProvider`)
- `tests` — unit tests for application use cases

## Environment Variables

| Variable              | Required | Default                   | Description                                                         |
| --------------------- | -------- | ------------------------- | ------------------------------------------------------------------- |
| `RESEND_API_KEY`      | Yes\*    | —                         | Resend API key. \*Required when `EMAIL_SEND_ENABLED` is `true`.     |
| `EMAIL_FROM`          | No       | `no-reply@example.com`    | Default sender address (must be verified in your Resend account).   |
| `EMAIL_REPLY_TO`      | No       | —                         | Default reply-to address.                                           |
| `EMAIL_SEND_ENABLED`  | No       | `true`                    | Set to `false` to disable delivery (returns a skipped result).      |
| `EMAIL_LOG_LEVEL`     | No       | `info`                    | Minimum log level for the default console logger (`debug`/`info`/`warn`/`error`). |

> **Never** use `VITE_` prefixes for these variables — they are server-only secrets.

## Quick Start

```typescript
import {
  loadNotificationConfig,
  ResendEmailProvider,
  SendEmailUseCase,
} from '@nxtlvl/notification-core';

const config = loadNotificationConfig();
const provider = new ResendEmailProvider(config);
const emailService = new SendEmailUseCase({ provider, config });

const result = await emailService.execute({
  to: 'recipient@example.com',
  subject: 'Welcome!',
  html: '<p>Thanks for joining.</p>',
});
```

## Key Exports

- `SendEmailInput` — typed input for outbound emails
- `SendEmailResult` — discriminated union result type
- `NotificationErrorCode` — canonical error codes
- `NotificationConfig` / `loadNotificationConfig` — server-side config
- `EmailProvider` — interface for pluggable delivery providers
- `EmailLogger` — interface for log-event sinks
- `ResendEmailProvider` — Resend SDK adapter (infrastructure)
- `SendEmailUseCase` — orchestration use case (application)

## Next Implementation Work

1. Add template rendering support (HTML templates via keys).
2. Add a concrete `ConsoleEmailLogger` adapter in `infrastructure/`.
3. Introduce per-program `EmailLogger` adapters that forward to `audit-core`.
4. Expand `SendEmailInput` with attachment support once provider confirms limits.
