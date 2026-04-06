# @nxtlvl/auth-core

Reusable authentication and account-access contracts for Nxt Lvl applications.

## Purpose

`auth-core` defines the application-agnostic foundation for:

- login
- invite-only signup integration
- password reset workflows
- admin-triggered reset eligibility
- security questions and emergency reset extensions
- session and token handling
- route access rules
- audit event emission

This package intentionally separates domain contracts, application use cases, infrastructure adapters, and any thin UI-facing exports.

## Package Layout

- `src/domain` contains business-facing types and contracts.
- `src/application` contains use-case orchestration.
- `src/config` contains app-level configuration contracts.
- `src/infrastructure` is reserved for adapter implementations.
- `src/ui` is reserved for thin UI-facing exports.
- `tests` contains starter test placeholders.

## Current Starter Concepts

- `AuthUser`
- `AuthAccount`
- `AuthSession`
- `LoginCredentials`
- `LoginResult`
- `AuthRepository`
- `PasswordHasher`
- `TokenService`
- `AuditLogger`
- `AuthConfig`
- `RouteAccessRule`
- `LoginUseCase`

## Next Implementation Work

1. Add a concrete repository adapter in `src/infrastructure`.
2. Add a password hashing adapter and token adapter.
3. Expand `LoginUseCase` with lockout policy enforcement and refresh token handling.
4. Introduce invite validation and reset workflows behind the existing contracts.