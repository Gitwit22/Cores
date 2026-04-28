# Cores

`cores` is the reusable internal foundation for Nxt Lvl applications.

It is not a single product or app. This repository holds modular core packages that can be shared across multiple systems such as Community Chronicle, StreamLine, Support Hub, and future Nxt Lvl platforms without hardcoding product-specific behavior into the core logic.

## Goals

- keep business logic app-agnostic and portable
- separate domain logic from UI, config, and persistence adapters
- establish clean package boundaries for long-term maintainability
- support future internal modules beyond auth

## Monorepo Structure

- `packages/auth-core` contains the first implemented core package for login and account access workflows.
- `packages/document-core` contains source-of-truth document vault contracts.
- `packages/attachment-core` contains universal document attachment/link contracts.
- `packages/storage-core` is reserved for reusable storage abstractions.
- `packages/invite-core` is reserved for invite issuance and acceptance flows.
- `packages/audit-core` is reserved for audit event abstractions.
- `packages/ticket-core` contains reusable request and case-management contracts.
- `packages/ui-core` is reserved for thin, reusable UI-facing primitives.
- `packages/shared` contains minimal cross-core utility types.
- `docs` contains repository-level architecture notes and roadmaps.

## auth-core Overview

The first implementation pass for `auth-core` focuses on architecture and contracts rather than a full feature build.

Included now:

- auth domain types and error model
- user, account, and session interfaces
- repository, password hashing, token, audit, and route guard contracts
- application-level login use case skeleton
- auth configuration types and defaults
- placeholder infrastructure and UI exports

Planned next:

- concrete adapters for persistence, hashing, and token issuance
- invite-only signup flow
- password reset use cases
- admin reset eligibility rules
- security question and emergency reset support
- richer route guard and permission evaluation

## Workspace Conventions

- TypeScript across all packages
- package-level `package.json` and `tsconfig.json` files for clear boundaries
- root workspace scripts for build, lint, format, and test
- clean public exports through each package `src/index.ts`

## Getting Started

1. Install dependencies with `npm install`.
2. Build packages with `npm run build`.
3. Start implementation in `packages/auth-core/src/application/login/LoginUseCase.ts` and the corresponding infrastructure adapters.

## Implementation Guidance

When adding real behavior, keep these rules intact:

- do not embed app branding or product-specific branching in core packages
- prefer injected adapters over direct framework or database dependencies
- keep UI wrappers thin and optional
- move shared cross-domain concepts into `shared` only when they are truly generic
