import type {
  BillingAuditLogEntry,
  BillingCheckoutSession,
  BillingCustomer,
  BillingCustomerId,
  BillingEntitlement,
  BillingPortalSession,
  BillingPrice,
  BillingProduct,
  BillingSubscription,
  BillingTrial,
  BillingWebhookEvent,
  CreateBillingCheckoutSessionInput,
  CreateBillingCustomerInput,
  CreateBillingPortalSessionInput,
  CreateBillingTrialInput,
  OrganizationId,
  RecordWebhookEventInput,
  UpsertBillingEntitlementInput,
  UpsertBillingPriceInput,
  UpsertBillingProductInput,
  UpsertBillingSubscriptionInput,
} from './types.js';

/**
 * BillingRepository defines the persistence contract for billing-core.
 * All concrete implementations live in infrastructure/.
 */
export interface BillingRepository {
  // customers
  findCustomerByOrg(organizationId: OrganizationId): Promise<BillingCustomer | undefined>;
  findCustomerByStripeId(stripeCustomerId: string): Promise<BillingCustomer | undefined>;
  createCustomer(input: CreateBillingCustomerInput): Promise<BillingCustomer>;
  updateCustomerStripeId(id: BillingCustomerId, stripeCustomerId: string): Promise<void>;

  // products
  findProductByInternalKey(internalProductKey: string): Promise<BillingProduct | undefined>;
  listProducts(programKey?: string): Promise<BillingProduct[]>;
  upsertProduct(input: UpsertBillingProductInput): Promise<BillingProduct>;

  // prices
  findPriceByInternalKey(internalPriceKey: string): Promise<BillingPrice | undefined>;
  findPriceByStripeId(stripePriceId: string): Promise<BillingPrice | undefined>;
  listPrices(billingProductId: string): Promise<BillingPrice[]>;
  upsertPrice(input: UpsertBillingPriceInput): Promise<BillingPrice>;

  // subscriptions
  findSubscriptionByOrg(
    organizationId: OrganizationId,
    programKey?: string,
  ): Promise<BillingSubscription | undefined>;
  findSubscriptionByStripeId(stripeSubscriptionId: string): Promise<BillingSubscription | undefined>;
  listSubscriptionsByOrg(organizationId: OrganizationId): Promise<BillingSubscription[]>;
  upsertSubscription(input: UpsertBillingSubscriptionInput): Promise<BillingSubscription>;

  // checkout sessions
  createCheckoutSession(
    input: CreateBillingCheckoutSessionInput & { stripeSessionId: string; stripePriceId: string },
  ): Promise<BillingCheckoutSession>;
  findCheckoutSessionByStripeId(stripeSessionId: string): Promise<BillingCheckoutSession | undefined>;
  updateCheckoutSessionStatus(
    stripeSessionId: string,
    status: BillingCheckoutSession['status'],
  ): Promise<void>;

  // portal sessions
  createPortalSession(
    input: CreateBillingPortalSessionInput & {
      stripeCustomerId: string;
      stripeSessionId: string;
      url: string;
    },
  ): Promise<BillingPortalSession>;

  // webhook events
  findWebhookEventByStripeId(stripeEventId: string): Promise<BillingWebhookEvent | undefined>;
  recordWebhookEvent(input: RecordWebhookEventInput): Promise<BillingWebhookEvent>;
  markWebhookEventProcessed(stripeEventId: string, error?: string): Promise<void>;
  listUnprocessedWebhookEvents(): Promise<BillingWebhookEvent[]>;

  // trials
  findTrialByOrgAndKey(
    organizationId: OrganizationId,
    programKey: string,
    trialKey: string,
  ): Promise<BillingTrial | undefined>;
  listTrialsByOrg(organizationId: OrganizationId): Promise<BillingTrial[]>;
  createTrial(input: CreateBillingTrialInput): Promise<BillingTrial>;
  updateTrialStatus(
    id: string,
    status: BillingTrial['status'],
    timestamp?: Date,
  ): Promise<void>;

  // entitlements
  listEntitlements(
    organizationId: OrganizationId,
    programKey?: string,
  ): Promise<BillingEntitlement[]>;
  upsertEntitlement(input: UpsertBillingEntitlementInput): Promise<BillingEntitlement>;
  revokeEntitlement(id: string): Promise<void>;

  // audit log
  appendAuditEntry(entry: Omit<BillingAuditLogEntry, 'id'>): Promise<void>;
  listAuditEntries(organizationId: OrganizationId, limit?: number): Promise<BillingAuditLogEntry[]>;
}
