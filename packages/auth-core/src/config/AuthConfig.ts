import type { RouteAccessRule } from '../domain/RouteGuard';

/**
 * App-level configuration injected into auth-core.
 */
export interface AuthConfig {
  issuer: string;
  allowLogin: boolean;
  requireVerifiedEmailForLogin: boolean;
  sessionTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  inviteOnlySignup: boolean;
  allowSelfServicePasswordReset: boolean;
  allowAdminInitiatedPasswordReset: boolean;
  allowSecurityQuestions: boolean;
  allowEmergencyResetCode: boolean;
  maxFailedLoginAttempts: number;
  lockoutDurationSeconds: number;
  defaultRoles: string[];
  routeDefaults: RouteAccessRule;
}

/**
 * Conservative defaults suitable for most internal apps.
 */
export const defaultAuthConfig: AuthConfig = {
  issuer: 'nxtlvl-auth-core',
  allowLogin: true,
  requireVerifiedEmailForLogin: false,
  sessionTtlSeconds: 60 * 60,
  refreshTokenTtlSeconds: 60 * 60 * 24 * 14,
  inviteOnlySignup: true,
  allowSelfServicePasswordReset: true,
  allowAdminInitiatedPasswordReset: true,
  allowSecurityQuestions: false,
  allowEmergencyResetCode: false,
  maxFailedLoginAttempts: 5,
  lockoutDurationSeconds: 60 * 15,
  defaultRoles: [],
  routeDefaults: {
    requireAuthenticated: true,
  },
};