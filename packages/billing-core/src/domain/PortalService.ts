import type { BillingPortalSession, OrganizationId } from './types.js';

export interface PortalSessionResult {
  url: string;
  session: BillingPortalSession;
}

/**
 * PortalService creates Stripe-hosted customer portal sessions.
 * Build now; expose to customers later.
 */
export interface PortalService {
  createPortalSession(
    organizationId: OrganizationId,
    userId: string | undefined,
    returnUrl: string,
  ): Promise<PortalSessionResult>;
}
