# auth-core Roadmap

## Current Scaffold

The first pass establishes contracts and boundaries for:

- auth users and auth accounts
- sessions and tokens
- login workflow orchestration
- route access evaluation contracts
- audit event hooks
- auth configuration

## Recommended Next Steps

1. Implement a concrete `AuthRepository` adapter for the target persistence layer.
2. Implement a concrete `PasswordHasher` using Argon2id or bcrypt.
3. Implement a concrete `TokenService` for signed access tokens and refresh tokens.
4. Expand `LoginUseCase` with lockout handling, refresh token issuance, and consistent failure auditing.
5. Add reset and invite use cases on top of the existing contracts.
6. Add route guard implementations in the consuming app or a dedicated adapter package.