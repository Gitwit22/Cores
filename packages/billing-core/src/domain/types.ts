/**
 * billing-core/domain/types.ts
 *
 * Core domain types and interfaces for the billing-core module.
 * These are application-agnostic and must not reference any specific framework,
 * database, or product.
 */

// ---------------------------------------------------------------------------
// Scalar aliases
// ---------------------------------------------------------------------------

export type BillingCustomerId = string;
export type BillingProductId = string;
export type BillingPriceId = string;
export type BillingSubscriptionId = string;
export type BillingCheckoutSessionId = string;
export type BillingPortalSessionId = string;
export type BillingWebhookEventId = string;
export type BillingTrialId = string;
export type BillingEntitlementId = string;
export type OrganizationId = string;
export type UserId = string;

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type BillingInterval = 'month' | 'year' | 'one_time';

export type BillingCustomerStatus = 'active' | 'inactive' | 'deleted';

export type BillingSubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused';

export type BillingTrialStatus = 'active' | 'converted' | 'expired' | 'canceled';

export type BillingEntitlementStatus = 'active' | 'expired' | 'revoked';

export type BillingEntitlementSourceType = 'trial' | 'subscription' | 'manual';

export type TrialBehaviorOnEnd = 'cancel' | 'pause' | 'convert' | 'grace_period';

// ---------------------------------------------------------------------------
// billing_customers
// ---------------------------------------------------------------------------

export interface BillingCustomer {
  id: BillingCustomerId;
  organizationId: OrganizationId;
  userId?: string;
  stripeCustomerId: string;
  email: string;
  name?: string;
  status: BillingCustomerStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBillingCustomerInput {
  organizationId: OrganizationId;
  userId?: string;
  stripeCustomerId: string;
  email: string;
  name?: string;
}

// ---------------------------------------------------------------------------
// billing_products
// ---------------------------------------------------------------------------

export interface BillingProduct {
  id: BillingProductId;
  programKey: string;
  internalProductKey: string;
  stripeProductId: string;
  name: string;
  active: boolean;
  metadata: Record<string, unknown>;
}

export interface UpsertBillingProductInput {
  programKey: string;
  internalProductKey: string;
  stripeProductId: string;
  name: string;
  active: boolean;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// billing_prices
// ---------------------------------------------------------------------------

export interface BillingPrice {
  id: BillingPriceId;
  billingProductId: BillingProductId;
  stripePriceId: string;
  interval: BillingInterval;
  amount: number;
  currency: string;
  trialDays?: number;
  active: boolean;
  metadata: Record<string, unknown>;
}

export interface UpsertBillingPriceInput {
  billingProductId: BillingProductId;
  stripePriceId: string;
  interval: BillingInterval;
  amount: number;
  currency: string;
  trialDays?: number;
  active: boolean;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// billing_subscriptions
// ---------------------------------------------------------------------------

export interface BillingSubscription {
  id: BillingSubscriptionId;
  organizationId: OrganizationId;
  userId?: string;
  programKey?: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  status: BillingSubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialStart?: Date;
  trialEnd?: Date;
  activeFrom: Date;
  activeUntil?: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertBillingSubscriptionInput {
  organizationId: OrganizationId;
  userId?: string;
  programKey?: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  status: BillingSubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialStart?: Date;
  trialEnd?: Date;
  activeFrom: Date;
  activeUntil?: Date;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// billing_checkout_sessions
// ---------------------------------------------------------------------------

export interface BillingCheckoutSession {
  id: BillingCheckoutSessionId;
  organizationId: OrganizationId;
  userId?: string;
  programKey: string;
  stripeSessionId: string;
  stripeCustomerId?: string;
  stripePriceId: string;
  status: 'open' | 'complete' | 'expired';
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBillingCheckoutSessionInput {
  organizationId: OrganizationId;
  userId?: string;
  programKey: string;
  internalPriceKey: string;
  successUrl: string;
  cancelUrl: string;
  trialDays?: number;
  requirePaymentMethod?: boolean;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// billing_portal_sessions
// ---------------------------------------------------------------------------

export interface BillingPortalSession {
  id: BillingPortalSessionId;
  organizationId: OrganizationId;
  userId?: string;
  stripeCustomerId: string;
  stripeSessionId: string;
  returnUrl: string;
  url: string;
  createdAt: Date;
}

export interface CreateBillingPortalSessionInput {
  organizationId: OrganizationId;
  userId?: string;
  returnUrl: string;
}

// ---------------------------------------------------------------------------
// billing_webhook_events
// ---------------------------------------------------------------------------

export interface BillingWebhookEvent {
  id: BillingWebhookEventId;
  stripeEventId: string;
  type: string;
  processed: boolean;
  processingError?: string;
  rawPayload: Record<string, unknown>;
  receivedAt: Date;
  processedAt?: Date;
}

export interface RecordWebhookEventInput {
  stripeEventId: string;
  type: string;
  rawPayload: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// billing_trials
// ---------------------------------------------------------------------------

export interface BillingTrial {
  id: BillingTrialId;
  organizationId: OrganizationId;
  userId?: string;
  programKey: string;
  trialKey: string;
  status: BillingTrialStatus;
  startedAt: Date;
  endsAt: Date;
  convertedAt?: Date;
  expiredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBillingTrialInput {
  organizationId: OrganizationId;
  userId?: string;
  programKey: string;
  trialKey: string;
  durationDays: number;
}

// ---------------------------------------------------------------------------
// billing_entitlements
// ---------------------------------------------------------------------------

export interface BillingEntitlement {
  id: BillingEntitlementId;
  organizationId: OrganizationId;
  programKey: string;
  featureKey: string;
  sourceType: BillingEntitlementSourceType;
  sourceId: string;
  status: BillingEntitlementStatus;
  startsAt: Date;
  endsAt?: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertBillingEntitlementInput {
  organizationId: OrganizationId;
  programKey: string;
  featureKey: string;
  sourceType: BillingEntitlementSourceType;
  sourceId: string;
  status: BillingEntitlementStatus;
  startsAt: Date;
  endsAt?: Date;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// billing_audit_log
// ---------------------------------------------------------------------------

export interface BillingAuditLogEntry {
  id: string;
  organizationId: OrganizationId;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown>;
  occurredAt: Date;
}

// ---------------------------------------------------------------------------
// Trial policy (in-memory rule engine)
// ---------------------------------------------------------------------------

export interface TrialPolicy {
  trialPolicyKey: string;
  programKey: string;
  appliesTo: 'org' | 'user';
  maxUses: number;
  durationDays: number;
  requiresPaymentMethod: boolean;
  behaviorOnEnd: TrialBehaviorOnEnd;
}

// ---------------------------------------------------------------------------
// Entitlement resolution
// ---------------------------------------------------------------------------

export interface ResolvedEntitlements {
  organizationId: OrganizationId;
  programKey: string;
  features: Record<string, boolean | number | string>;
}

// ---------------------------------------------------------------------------
// Billing metadata (attached to Stripe objects)
// ---------------------------------------------------------------------------

export interface BillingStripeMetadata {
  organizationId: string;
  userId?: string;
  programKey?: string;
  environment?: string;
  [key: string]: string | undefined;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export enum BillingErrorCode {
  CUSTOMER_NOT_FOUND = 'BILLING_CUSTOMER_NOT_FOUND',
  CUSTOMER_ALREADY_EXISTS = 'BILLING_CUSTOMER_ALREADY_EXISTS',
  PRODUCT_NOT_FOUND = 'BILLING_PRODUCT_NOT_FOUND',
  PRICE_NOT_FOUND = 'BILLING_PRICE_NOT_FOUND',
  SUBSCRIPTION_NOT_FOUND = 'BILLING_SUBSCRIPTION_NOT_FOUND',
  CHECKOUT_SESSION_NOT_FOUND = 'BILLING_CHECKOUT_SESSION_NOT_FOUND',
  TRIAL_NOT_FOUND = 'BILLING_TRIAL_NOT_FOUND',
  TRIAL_ALREADY_EXISTS = 'BILLING_TRIAL_ALREADY_EXISTS',
  TRIAL_INELIGIBLE = 'BILLING_TRIAL_INELIGIBLE',
  ENTITLEMENT_NOT_FOUND = 'BILLING_ENTITLEMENT_NOT_FOUND',
  WEBHOOK_DUPLICATE = 'BILLING_WEBHOOK_DUPLICATE',
  WEBHOOK_SIGNATURE_INVALID = 'BILLING_WEBHOOK_SIGNATURE_INVALID',
  STRIPE_ERROR = 'BILLING_STRIPE_ERROR',
  BILLING_DISABLED = 'BILLING_DISABLED',
  VALIDATION_ERROR = 'BILLING_VALIDATION_ERROR',
  UNKNOWN = 'BILLING_UNKNOWN',
}

export interface BillingError {
  code: BillingErrorCode;
  message: string;
  details?: unknown;
}

export function createBillingError(
  code: BillingErrorCode,
  message: string,
  details?: unknown,
): BillingError {
  return { code, message, details };
}
