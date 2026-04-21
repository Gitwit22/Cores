import { randomUUID } from 'node:crypto';

import type { BillingConfig } from '../../config/BillingConfig.js';
import type { BillingAuditLogger } from '../../domain/BillingAuditLogger.js';
import type { BillingRepository } from '../../domain/BillingRepository.js';
import type { StripeService } from '../../domain/StripeService.js';
import {
  BillingErrorCode,
  createBillingError,
  type BillingCheckoutSession,
  type BillingError,
  type CreateBillingCheckoutSessionInput,
} from '../../domain/types.js';

export type CreateCheckoutSessionResult =
  | { success: true; session: BillingCheckoutSession; url: string }
  | { success: false; error: BillingError };

export interface CreateCheckoutSessionUseCaseDependencies {
  repository: BillingRepository;
  stripeService: StripeService;
  auditLogger: BillingAuditLogger;
  config: BillingConfig;
  createId?: () => string;
  now?: () => Date;
}

export class CreateCheckoutSessionUseCase {
  private readonly repository: BillingRepository;
  private readonly stripeService: StripeService;
  private readonly auditLogger: BillingAuditLogger;
  private readonly config: BillingConfig;
  private readonly createId: () => string;
  private readonly now: () => Date;

  constructor(deps: CreateCheckoutSessionUseCaseDependencies) {
    this.repository = deps.repository;
    this.stripeService = deps.stripeService;
    this.auditLogger = deps.auditLogger;
    this.config = deps.config;
    this.createId = deps.createId ?? (() => randomUUID());
    this.now = deps.now ?? (() => new Date());
  }

  async execute(input: CreateBillingCheckoutSessionInput): Promise<CreateCheckoutSessionResult> {
    if (!this.config.enabled) {
      return {
        success: false,
        error: createBillingError(BillingErrorCode.BILLING_DISABLED, 'Billing is not enabled.'),
      };
    }

    if (!this.config.checkoutEnabled) {
      return {
        success: false,
        error: createBillingError(
          BillingErrorCode.BILLING_DISABLED,
          'Checkout is not enabled.',
        ),
      };
    }

    const price = await this.repository.findPriceByInternalKey(input.internalPriceKey);
    if (!price) {
      return {
        success: false,
        error: createBillingError(
          BillingErrorCode.PRICE_NOT_FOUND,
          `No price found for key: ${input.internalPriceKey}`,
        ),
      };
    }

    const existingCustomer = await this.repository.findCustomerByOrg(input.organizationId);

    const stripeSession = await this.stripeService.createCheckoutSession({
      stripeCustomerId: existingCustomer?.stripeCustomerId,
      stripePriceId: price.stripePriceId,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      trialDays: input.trialDays ?? price.trialDays,
      requirePaymentMethod: input.requirePaymentMethod,
      metadata: {
        organizationId: input.organizationId,
        userId: input.userId,
        programKey: input.programKey,
      },
    });

    const session = await this.repository.createCheckoutSession({
      ...input,
      stripeSessionId: stripeSession.stripeSessionId,
      stripeCustomerId: existingCustomer?.stripeCustomerId,
      stripePriceId: price.stripePriceId,
      metadata: input.metadata ?? {},
    });

    const _traceId = this.createId();
    void _traceId;

    await this.auditLogger.log({
      action: 'billing.checkout.session.created',
      organizationId: input.organizationId,
      userId: input.userId,
      resourceType: 'billing_checkout_session',
      resourceId: session.id,
      occurredAt: this.now(),
      details: { programKey: input.programKey, internalPriceKey: input.internalPriceKey },
    });

    return { success: true, session, url: stripeSession.url };
  }
}
