import type { BillingConfig } from '../../config/BillingConfig.js';
import type { BillingAuditLogger } from '../../domain/BillingAuditLogger.js';
import type { CatalogService } from '../../domain/CatalogService.js';
import {
  BillingErrorCode,
  createBillingError,
  type BillingError,
} from '../../domain/types.js';

export type SyncCatalogResult =
  | { success: true; created: number; updated: number; errors: string[] }
  | { success: false; error: BillingError };

export interface SyncCatalogUseCaseDependencies {
  catalogService: CatalogService;
  auditLogger: BillingAuditLogger;
  config: BillingConfig;
  now?: () => Date;
}

export class SyncCatalogUseCase {
  private readonly catalogService: CatalogService;
  private readonly auditLogger: BillingAuditLogger;
  private readonly config: BillingConfig;
  private readonly now: () => Date;

  constructor(deps: SyncCatalogUseCaseDependencies) {
    this.catalogService = deps.catalogService;
    this.auditLogger = deps.auditLogger;
    this.config = deps.config;
    this.now = deps.now ?? (() => new Date());
  }

  async execute(actorUserId?: string): Promise<SyncCatalogResult> {
    if (!this.config.enabled) {
      return {
        success: false,
        error: createBillingError(BillingErrorCode.BILLING_DISABLED, 'Billing is not enabled.'),
      };
    }

    const syncResult = await this.catalogService.syncCatalog();

    await this.auditLogger.log({
      action: 'billing.catalog.synced',
      organizationId: 'system',
      userId: actorUserId,
      resourceType: 'billing_catalog',
      resourceId: 'catalog',
      occurredAt: this.now(),
      details: syncResult,
    });

    return { success: true, ...syncResult };
  }
}
