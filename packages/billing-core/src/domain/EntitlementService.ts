import type { BillingEntitlement, OrganizationId, ResolvedEntitlements } from './types.js';

/**
 * EntitlementService resolves what an organization is allowed to use
 * for a given program, decoupling apps from Stripe directly.
 */
export interface EntitlementService {
  /**
   * Recompute and persist entitlements for an org/program after a
   * subscription or trial state change.
   */
  recomputeEntitlements(
    organizationId: OrganizationId,
    programKey: string,
  ): Promise<BillingEntitlement[]>;

  /**
   * Returns the current resolved entitlements for an org/program.
   * Apps should call this, not Stripe directly.
   */
  resolveEntitlements(
    organizationId: OrganizationId,
    programKey: string,
  ): Promise<ResolvedEntitlements>;

  /**
   * Convenience helper for feature gate checks.
   */
  canUseFeature(
    organizationId: OrganizationId,
    programKey: string,
    featureKey: string,
  ): Promise<boolean>;

  /**
   * Grant a manual entitlement override (admin use only).
   */
  grantManualEntitlement(
    organizationId: OrganizationId,
    programKey: string,
    featureKey: string,
    sourceId: string,
    endsAt?: Date,
  ): Promise<BillingEntitlement>;
}
