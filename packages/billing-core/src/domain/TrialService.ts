import type { BillingTrial, OrganizationId, TrialPolicy } from './types.js';

export interface TrialEligibilityResult {
  eligible: boolean;
  reason?: string;
  policy?: TrialPolicy;
}

/**
 * TrialService encapsulates the free-trial rule engine.
 * Build it now; don't enable until billing.trialEngine.enabled = true.
 */
export interface TrialService {
  checkEligibility(
    organizationId: OrganizationId,
    userId: string | undefined,
    programKey: string,
    trialKey: string,
  ): Promise<TrialEligibilityResult>;

  startTrial(
    organizationId: OrganizationId,
    userId: string | undefined,
    programKey: string,
    trialKey: string,
  ): Promise<BillingTrial>;

  expireTrials(): Promise<{ expired: number }>;

  convertTrial(trialId: string): Promise<void>;
}
