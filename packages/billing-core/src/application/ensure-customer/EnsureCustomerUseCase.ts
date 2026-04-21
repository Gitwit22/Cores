import { randomUUID } from 'node:crypto';

import type { BillingConfig } from '../../config/BillingConfig.js';
import type { BillingAuditLogger } from '../../domain/BillingAuditLogger.js';
import type { BillingRepository } from '../../domain/BillingRepository.js';
import type { StripeService } from '../../domain/StripeService.js';
import {
  BillingErrorCode,
  createBillingError,
  type BillingCustomer,
  type BillingError,
  type OrganizationId,
} from '../../domain/types.js';

export interface EnsureCustomerInput {
  organizationId: OrganizationId;
  userId?: string;
  email: string;
  name?: string;
}

export type EnsureCustomerResult =
  | { success: true; customer: BillingCustomer; created: boolean }
  | { success: false; error: BillingError };

export interface EnsureCustomerUseCaseDependencies {
  repository: BillingRepository;
  stripeService: StripeService;
  auditLogger: BillingAuditLogger;
  config: BillingConfig;
  createId?: () => string;
  now?: () => Date;
}

export class EnsureCustomerUseCase {
  private readonly repository: BillingRepository;
  private readonly stripeService: StripeService;
  private readonly auditLogger: BillingAuditLogger;
  private readonly config: BillingConfig;
  private readonly createId: () => string;
  private readonly now: () => Date;

  constructor(deps: EnsureCustomerUseCaseDependencies) {
    this.repository = deps.repository;
    this.stripeService = deps.stripeService;
    this.auditLogger = deps.auditLogger;
    this.config = deps.config;
    this.createId = deps.createId ?? (() => randomUUID());
    this.now = deps.now ?? (() => new Date());
  }

  async execute(input: EnsureCustomerInput): Promise<EnsureCustomerResult> {
    if (!this.config.enabled) {
      return {
        success: false,
        error: createBillingError(BillingErrorCode.BILLING_DISABLED, 'Billing is not enabled.'),
      };
    }

    const existing = await this.repository.findCustomerByOrg(input.organizationId);
    if (existing) {
      return { success: true, customer: existing, created: false };
    }

    const stripeCustomer = await this.stripeService.createCustomer({
      email: input.email,
      name: input.name,
      metadata: {
        organizationId: input.organizationId,
        userId: input.userId,
      },
    });

    const customer = await this.repository.createCustomer({
      organizationId: input.organizationId,
      userId: input.userId,
      stripeCustomerId: stripeCustomer.stripeCustomerId,
      email: input.email,
      name: input.name,
    });

    const _traceId = this.createId();
    void _traceId;

    await this.auditLogger.log({
      action: 'billing.customer.created',
      organizationId: input.organizationId,
      userId: input.userId,
      resourceType: 'billing_customer',
      resourceId: customer.id,
      occurredAt: this.now(),
    });

    return { success: true, customer, created: true };
  }
}
