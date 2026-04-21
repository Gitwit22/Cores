import type { BillingConfig } from '../../config/BillingConfig.js';
import type { EntitlementService } from '../../domain/EntitlementService.js';
import {
  BillingErrorCode,
  createBillingError,
  type BillingError,
  type OrganizationId,
  type ResolvedEntitlements,
} from '../../domain/types.js';

export interface ResolveEntitlementsInput {
  organizationId: OrganizationId;
  programKey: string;
}

export type ResolveEntitlementsResult =
  | { success: true; entitlements: ResolvedEntitlements }
  | { success: false; error: BillingError };

export interface ResolveEntitlementsUseCaseDependencies {
  entitlementService: EntitlementService;
  config: BillingConfig;
}

export class ResolveEntitlementsUseCase {
  private readonly entitlementService: EntitlementService;
  private readonly config: BillingConfig;

  constructor(deps: ResolveEntitlementsUseCaseDependencies) {
    this.entitlementService = deps.entitlementService;
    this.config = deps.config;
  }

  async execute(input: ResolveEntitlementsInput): Promise<ResolveEntitlementsResult> {
    if (!this.config.enabled) {
      return {
        success: false,
        error: createBillingError(BillingErrorCode.BILLING_DISABLED, 'Billing is not enabled.'),
      };
    }

    const entitlements = await this.entitlementService.resolveEntitlements(
      input.organizationId,
      input.programKey,
    );

    return { success: true, entitlements };
  }
}
