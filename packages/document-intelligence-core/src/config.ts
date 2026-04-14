/**
 * document-intelligence-core/config.ts
 *
 * Centralized configuration and feature toggles for the document intelligence
 * core. These settings are the single source of truth for runtime behavior.
 *
 * Connect to the Settings UI / env vars as needed. Do not scatter config
 * constants across individual provider or service files.
 */

import type { DocumentIntelligenceProvider, DocumentCapability } from './types.js';

// ---------------------------------------------------------------------------
// Default classification categories
// ---------------------------------------------------------------------------

/**
 * Starter classification categories for Community Chronicle.
 * These are the defaults; any caller may supply an override list via
 * DocumentIntelligenceConfig.classificationCategories when using the service
 * layer, so this list does not permanently bind the core to Chronicle.
 */
export const CHRONICLE_DEFAULT_CATEGORIES: readonly string[] = [
  'irs_notice',
  'bank_receipt',
  'invoice',
  'meeting_minutes',
  'board_governance',
  'grant_document',
  'contract',
  'newsletter',
  'general_report',
  'uncategorized',
] as const;

// ---------------------------------------------------------------------------
// Config shape
// ---------------------------------------------------------------------------

/**
 * Runtime configuration for the document intelligence core.
 * All fields are optional — sensible defaults are applied by
 * `resolveConfig()`.
 */
export interface DocumentIntelligenceConfig {
  /** Provider to use when none is specified by the caller */
  defaultProvider?: DocumentIntelligenceProvider;

  /** Capabilities that are enabled. Defaults to all known capabilities. */
  enabledCapabilities?: DocumentCapability[];

  /**
   * Minimum confidence score [0–1] below which a classification result
   * will fall back to "uncategorized".
   */
  classificationConfidenceThreshold?: number;

  /**
   * Minimum confidence score [0–1] below which an extraction result
   * will be marked as low-confidence in logs.
   */
  extractionConfidenceThreshold?: number;

  /**
   * Classification category list. Override to supply program-specific
   * categories without modifying the core.
   *
   * Defaults to CHRONICLE_DEFAULT_CATEGORIES.
   */
  classificationCategories?: readonly string[];

  /**
   * Enable verbose debug logging for all capability calls.
   * Never enable in production — may output large parsed document text.
   */
  debugLogging?: boolean;

  /**
   * When true, service calls log timing and metadata but skip real
   * provider API calls. Useful for local development.
   */
  dryRun?: boolean;
}

// ---------------------------------------------------------------------------
// Defaults & resolution
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: Required<DocumentIntelligenceConfig> = {
  defaultProvider: 'llama-cloud',
  enabledCapabilities: ['parse', 'classify', 'extract', 'split', 'index', 'sheets'],
  classificationConfidenceThreshold: 0.5,
  extractionConfidenceThreshold: 0.4,
  classificationCategories: CHRONICLE_DEFAULT_CATEGORIES,
  debugLogging: false,
  dryRun: false,
};

/**
 * Merges caller-supplied overrides with the hard defaults.
 * Always returns a fully populated config object.
 */
export function resolveConfig(
  overrides?: DocumentIntelligenceConfig,
): Required<DocumentIntelligenceConfig> {
  return { ...DEFAULT_CONFIG, ...overrides };
}

/**
 * The active shared config instance.
 *
 * Most callers should use `resolveConfig()` directly. This singleton is
 * provided for convenience when a module needs to read config without
 * threading it through every function call.
 *
 * Call `configureDocumentIntelligence()` early in your app startup to
 * override defaults.
 */
let _activeConfig: Required<DocumentIntelligenceConfig> = DEFAULT_CONFIG;

/**
 * Override the active shared config. Call once at app startup.
 */
export function configureDocumentIntelligence(
  overrides: DocumentIntelligenceConfig,
): void {
  _activeConfig = resolveConfig(overrides);
}

/**
 * Read the currently active shared config.
 */
export function getDocumentIntelligenceConfig(): Required<DocumentIntelligenceConfig> {
  return _activeConfig;
}
