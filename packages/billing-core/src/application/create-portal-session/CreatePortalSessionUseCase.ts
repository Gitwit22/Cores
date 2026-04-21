import { randomUUID } from 'node:crypto';

import type { BillingConfig } from '../../config/BillingConfig.js';
import type { BillingAuditLogger } from '../../domain/BillingAuditLogger.js';
import type { BillingRepository } from '../../domain/BillingRepository.js';
import type { PortalSessionResult, PortalService } from '../../domain/PortalService.js';
import type { StripeService } from '../../domain/StripeService.js';
import {
  BillingErrorCode,
  createBillingError,
  type BillingError,
  type OrganizationId,
} from '../../domain/types.js';

export interface CreatePortalSessionInput {
  organizationId: OrganizationId;
  userId?: string;
  returnUrl: string;
}

export type CreatePortalSessionResult =
  | { success: true; url: string }
  | { success: false; error: BillingError };

export interface CreatePortalSessionUseCaseDependencies {
  repository: BillingRepository;
  stripeService: StripeService;
  portalService: PortalService;
  auditLogger: BillingAuditLogger;
  config: BillingConfig;
  createId?: () => string;
  now?: () => Date;
}

export class CreatePortalSessionUseCase {
  private readonly repository: BillingRepository;
  private readonly portalService: PortalService;
  private readonly auditLogger: BillingAuditLogger;
  private readonly config: BillingConfig;
  private readonly createId: () => string;
  private readonly now: () => Date;

  constructor(deps: CreatePortalSessionUseCaseDependencies) {
    this.repository = deps.repository;
    this.portalService = deps.portalService;
    this.auditLogger = deps.auditLogger;
    this.config = deps.config;
    this.createId = deps.createId ?? (() => randomUUID());
    this.now = deps.now ?? (() => new Date());
  }

  async execute(input: CreatePortalSessionInput): Promise<CreatePortalSessionResult> {
    if (!this.config.enabled) {
      return {
        success: false,
        error: createBillingError(BillingErrorCode.BILLING_DISABLED, 'Billing is not enabled.'),
      };
    }

    if (!this.config.portalEnabled) {
      return {
        success: false,
        error: createBillingError(BillingErrorCode.BILLING_DISABLED, 'Portal is not enabled.'),
      };
    }

    const result: PortalSessionResult = await this.portalService.createPortalSession(
      input.organizationId,
      input.userId,
      input.returnUrl,
    );

    const _traceId = this.createId();
    void _traceId;

    await this.auditLogger.log({
      action: 'billing.portal.session.created',
      organizationId: input.organizationId,
      userId: input.userId,
      resourceType: 'billing_portal_session',
      resourceId: result.session.id,
      occurredAt: this.now(),
    });

    return { success: true, url: result.url };
  }
}
