export interface BillingCatalogEntry {
  programKey: string;
  internalProductKey: string;
  productName: string;
  prices: Array<{
    internalPriceKey: string;
    interval: 'month' | 'year' | 'one_time';
    amount: number;
    currency: string;
    trialDays?: number;
  }>;
}

/**
 * CatalogService reads a local billing config and syncs it to Stripe,
 * storing returned Stripe IDs in the database.
 */
export interface CatalogService {
  loadCatalog(): Promise<BillingCatalogEntry[]>;
  syncCatalog(): Promise<{ created: number; updated: number; errors: string[] }>;
}
