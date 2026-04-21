import type { OrganizationId } from './types.js';

export type BillingAuditAction =
  | 'billing.customer.created'
  | 'billing.customer.ensured'
  | 'billing.checkout.session.created'
  | 'billing.portal.session.created'
  | 'billing.subscription.created'
  | 'billing.subscription.updated'
  | 'billing.subscription.canceled'
  | 'billing.trial.started'
  | 'billing.trial.converted'
  | 'billing.trial.expired'
  | 'billing.entitlement.granted'
  | 'billing.entitlement.revoked'
  | 'billing.webhook.received'
  | 'billing.webhook.processed'
  | 'billing.webhook.failed'
  | 'billing.catalog.synced'
  | 'billing.manual.entitlement.granted';

export interface BillingAuditEvent {
  action: BillingAuditAction;
  organizationId: OrganizationId;
  userId?: string;
  resourceType: string;
  resourceId: string;
  occurredAt: Date;
  details?: Record<string, unknown>;
}

export interface BillingAuditLogger {
  log(event: BillingAuditEvent): Promise<void>;
}
