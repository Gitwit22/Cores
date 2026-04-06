import { randomUUID } from 'node:crypto';

import type { AuthConfig } from '../../config/AuthConfig';
import type { AuditLogger } from '../../domain/AuditLogger';
import type { AuthRepository } from '../../domain/AuthRepository';
import type { PasswordHasher } from '../../domain/PasswordHasher';
import type { TokenService } from '../../domain/TokenService';
import {
  AuthErrorCode,
  createAuthError,
  type AuthSession,
  type LoginContext,
  type LoginCredentials,
  type LoginResult,
} from '../../domain/types';

export interface LoginUseCaseDependencies {
  authRepository: AuthRepository;
  passwordHasher: PasswordHasher;
  tokenService: TokenService;
  auditLogger: AuditLogger;
  config: AuthConfig;
  createSessionId?: () => string;
  now?: () => Date;
}

/**
 * LoginUseCase coordinates the core login workflow without binding to a UI
 * framework, transport, or storage implementation.
 */
export class LoginUseCase {
  private readonly authRepository: AuthRepository;
  private readonly passwordHasher: PasswordHasher;
  private readonly tokenService: TokenService;
  private readonly auditLogger: AuditLogger;
  private readonly config: AuthConfig;
  private readonly createSessionId: () => string;
  private readonly now: () => Date;

  constructor(dependencies: LoginUseCaseDependencies) {
    this.authRepository = dependencies.authRepository;
    this.passwordHasher = dependencies.passwordHasher;
    this.tokenService = dependencies.tokenService;
    this.auditLogger = dependencies.auditLogger;
    this.config = dependencies.config;
    this.createSessionId = dependencies.createSessionId ?? (() => randomUUID());
    this.now = dependencies.now ?? (() => new Date());
  }

  async execute(credentials: LoginCredentials, context: LoginContext = {}): Promise<LoginResult> {
    if (!this.config.allowLogin) {
      return {
        success: false,
        error: createAuthError(
          AuthErrorCode.LOGIN_DISABLED,
          'Login is currently disabled by configuration.',
        ),
      };
    }

    const normalizedEmail = credentials.email.trim().toLowerCase();
    const account = await this.authRepository.findAccountByEmail(normalizedEmail);

    if (!account) {
      await this.auditLogger.log({
        action: 'auth.login.failed',
        actor: { email: normalizedEmail },
        occurredAt: this.now(),
        outcome: 'failure',
        context,
        details: { reason: AuthErrorCode.INVALID_CREDENTIALS },
      });

      return {
        success: false,
        error: createAuthError(
          AuthErrorCode.INVALID_CREDENTIALS,
          'The provided credentials are invalid.',
        ),
      };
    }

    const user = await this.authRepository.findUserById(account.userId);

    if (!user) {
      return {
        success: false,
        error: createAuthError(AuthErrorCode.USER_NOT_FOUND, 'No user record exists for this account.'),
      };
    }

    if (!user.isActive) {
      return {
        success: false,
        error: createAuthError(AuthErrorCode.ACCOUNT_INACTIVE, 'This account is inactive.'),
      };
    }

    if (account.isLocked) {
      return {
        success: false,
        error: createAuthError(AuthErrorCode.ACCOUNT_LOCKED, 'This account is locked.'),
      };
    }

    if (this.config.requireVerifiedEmailForLogin && !user.isEmailVerified) {
      return {
        success: false,
        error: createAuthError(
          AuthErrorCode.EMAIL_NOT_VERIFIED,
          'Email verification is required before login.',
        ),
      };
    }

    if (user.requiresPasswordReset) {
      return {
        success: false,
        error: createAuthError(
          AuthErrorCode.PASSWORD_RESET_REQUIRED,
          'A password reset is required before login.',
        ),
      };
    }

    const isPasswordValid = await this.passwordHasher.compare(
      credentials.password,
      account.passwordHash,
    );

    if (!isPasswordValid) {
      const nextFailedAttempts = account.failedLoginAttempts + 1;
      await this.authRepository.updateAccount(account.id, {
        failedLoginAttempts: nextFailedAttempts,
        updatedAt: this.now(),
      });

      await this.auditLogger.log({
        action: 'auth.login.failed',
        actor: { userId: user.id, email: user.email, roles: user.roles },
        subjectUserId: user.id,
        occurredAt: this.now(),
        outcome: 'failure',
        context,
        details: {
          reason: AuthErrorCode.INVALID_CREDENTIALS,
          failedLoginAttempts: nextFailedAttempts,
        },
      });

      return {
        success: false,
        error: createAuthError(
          AuthErrorCode.INVALID_CREDENTIALS,
          'The provided credentials are invalid.',
        ),
      };
    }

    const issuedAt = this.now();
    const sessionId = this.createSessionId();
    const accessToken = await this.tokenService.sign({
      sub: user.id,
      email: user.email,
      roles: user.roles,
      sessionId,
    });

    const session: AuthSession = {
      sessionId,
      userId: user.id,
      accessToken,
      expiresAt: new Date(issuedAt.getTime() + this.config.sessionTtlSeconds * 1000),
      createdAt: issuedAt,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: context.metadata,
    };

    await this.authRepository.createSession(session);
    await this.authRepository.updateAccount(account.id, {
      failedLoginAttempts: 0,
      lastLoginAt: issuedAt,
      updatedAt: issuedAt,
    });
    await this.auditLogger.log({
      action: 'auth.login.succeeded',
      actor: { userId: user.id, email: user.email, roles: user.roles },
      subjectUserId: user.id,
      sessionId,
      occurredAt: issuedAt,
      outcome: 'success',
      context,
    });

    return {
      success: true,
      user,
      session,
    };
  }
}