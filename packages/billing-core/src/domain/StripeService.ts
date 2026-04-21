import type { BillingStripeMetadata } from './types.js';

export interface StripeCreateCustomerInput {
  email: string;
  name?: string;
  metadata?: BillingStripeMetadata;
}

export interface StripeCustomerResult {
  stripeCustomerId: string;
  email: string;
}

export interface StripeCreateProductInput {
  name: string;
  metadata?: Record<string, string>;
}

export interface StripeProductResult {
  stripeProductId: string;
  name: string;
}

export interface StripeCreatePriceInput {
  stripeProductId: string;
  unitAmount: number;
  currency: string;
  interval: 'month' | 'year' | null;
  trialDays?: number;
  metadata?: Record<string, string>;
}

export interface StripePriceResult {
  stripePriceId: string;
  unitAmount: number;
  currency: string;
}

export interface StripeCreateCheckoutSessionInput {
  stripeCustomerId?: string;
  stripePriceId: string;
  successUrl: string;
  cancelUrl: string;
  trialDays?: number;
  requirePaymentMethod?: boolean;
  metadata?: BillingStripeMetadata;
}

export interface StripeCheckoutSessionResult {
  stripeSessionId: string;
  url: string;
}

export interface StripeCreatePortalSessionInput {
  stripeCustomerId: string;
  returnUrl: string;
}

export interface StripePortalSessionResult {
  stripeSessionId: string;
  url: string;
}

/**
 * StripeService is the anti-corruption layer between billing-core and the
 * Stripe SDK. Concrete implementation lives in infrastructure/.
 */
export interface StripeService {
  createCustomer(input: StripeCreateCustomerInput): Promise<StripeCustomerResult>;
  createProduct(input: StripeCreateProductInput): Promise<StripeProductResult>;
  updateProduct(stripeProductId: string, updates: Partial<StripeCreateProductInput>): Promise<void>;
  createPrice(input: StripeCreatePriceInput): Promise<StripePriceResult>;
  archivePrice(stripePriceId: string): Promise<void>;
  createCheckoutSession(input: StripeCreateCheckoutSessionInput): Promise<StripeCheckoutSessionResult>;
  createPortalSession(input: StripeCreatePortalSessionInput): Promise<StripePortalSessionResult>;
  verifyWebhookSignature(payload: Buffer | string, signature: string): Promise<Record<string, unknown>>;
}
