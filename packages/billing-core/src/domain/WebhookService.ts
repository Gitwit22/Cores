import type { BillingWebhookEvent } from './types.js';

export type StripeWebhookEventType =
  | 'checkout.session.completed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.paid'
  | 'invoice.payment_failed'
  | 'customer.subscription.trial_will_end';

export interface WebhookProcessResult {
  eventId: string;
  type: string;
  handled: boolean;
  skipped: boolean;
  error?: string;
}

/**
 * WebhookService is the backbone of the billing system.
 * It verifies, deduplicates, persists, and processes Stripe webhook events.
 */
export interface WebhookService {
  /**
   * Entry point for raw webhook payloads from the HTTP layer.
   * Verifies the Stripe signature, dedupes by event ID, stores the raw
   * event, and delegates to the appropriate handler.
   */
  handleIncomingWebhook(
    payload: Buffer | string,
    stripeSignature: string,
  ): Promise<WebhookProcessResult>;

  /**
   * Reprocess a previously stored webhook event (for admin use / recovery).
   */
  reprocessEvent(stripeEventId: string): Promise<WebhookProcessResult>;

  /**
   * List unprocessed or failed events for admin inspection.
   */
  listPendingEvents(): Promise<BillingWebhookEvent[]>;
}
