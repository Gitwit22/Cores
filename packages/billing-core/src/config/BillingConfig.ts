/**
 * BillingConfig controls billing feature flags and behavior.
 * All enforcement flags default to false so billing can be built
 * without affecting existing programs.
 */
export interface BillingConfig {
  /** Master kill-switch. When false, all billing routes return 503. */
  enabled: boolean;
  /** Allow checkout session creation. */
  checkoutEnabled: boolean;
  /** Allow customer portal session creation. */
  portalEnabled: boolean;
  /**
   * When true, feature-gate checks will actually block access.
   * Keep false until billing is fully launched.
   */
  enforceEntitlements: boolean;
  /** Enable the trial engine. */
  trialEngineEnabled: boolean;
  /** Default currency (ISO 4217). */
  defaultCurrency: string;
  /** Default trial duration used when no policy specifies one. */
  defaultTrialDays: number;
  /** Return URL used after the customer portal session. */
  billingReturnUrl: string;
  /** Stripe success redirect URL. */
  stripeSuccessUrl: string;
  /** Stripe cancel redirect URL. */
  stripeCancelUrl: string;
}

export const defaultBillingConfig: BillingConfig = {
  enabled: false,
  checkoutEnabled: false,
  portalEnabled: false,
  enforceEntitlements: false,
  trialEngineEnabled: false,
  defaultCurrency: 'usd',
  defaultTrialDays: 14,
  billingReturnUrl: '',
  stripeSuccessUrl: '',
  stripeCancelUrl: '',
};
