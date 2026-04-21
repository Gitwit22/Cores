/**
 * Thin UI-facing exports for billing-core.
 */

export interface BillingStatusViewModel {
  organizationId: string;
  programKey: string;
  subscriptionStatus: string | null;
  isTrialing: boolean;
  trialEndsAt: Date | null;
  features: Record<string, boolean | number | string>;
}

export interface CheckoutButtonViewModel {
  programKey: string;
  internalPriceKey: string;
  label: string;
  isLoading: boolean;
  errorMessage?: string;
}
