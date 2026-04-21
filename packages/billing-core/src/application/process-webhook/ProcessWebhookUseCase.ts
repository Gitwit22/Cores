import type { BillingConfig } from '../../config/BillingConfig.js';
import type { WebhookProcessResult, WebhookService } from '../../domain/WebhookService.js';
import {
  BillingErrorCode,
  createBillingError,
  type BillingError,
} from '../../domain/types.js';

export interface ProcessWebhookInput {
  payload: Buffer | string;
  stripeSignature: string;
}

export type ProcessWebhookResult =
  | { success: true; result: WebhookProcessResult }
  | { success: false; error: BillingError };

export interface ProcessWebhookUseCaseDependencies {
  webhookService: WebhookService;
  config: BillingConfig;
}

export class ProcessWebhookUseCase {
  private readonly webhookService: WebhookService;
  private readonly config: BillingConfig;

  constructor(deps: ProcessWebhookUseCaseDependencies) {
    this.webhookService = deps.webhookService;
    this.config = deps.config;
  }

  async execute(input: ProcessWebhookInput): Promise<ProcessWebhookResult> {
    if (!this.config.enabled) {
      return {
        success: false,
        error: createBillingError(BillingErrorCode.BILLING_DISABLED, 'Billing is not enabled.'),
      };
    }

    const result = await this.webhookService.handleIncomingWebhook(
      input.payload,
      input.stripeSignature,
    );

    return { success: true, result };
  }
}
