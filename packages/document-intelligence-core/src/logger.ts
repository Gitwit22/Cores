/**
 * document-intelligence-core/logger.ts
 *
 * Structured logging for the document intelligence core.
 *
 * Rules enforced here:
 * - Never log API keys or secrets
 * - Never log full extracted document content unless debug mode is on
 *   and the calling app explicitly opts in
 * - Always log documentId, jobId, fileName, provider, and duration
 * - Log capability events: started / completed / failed
 */

import { getDocumentIntelligenceConfig } from './config.js';
import type { DocumentCapability, DocumentIntelligenceProvider } from './types.js';

// ---------------------------------------------------------------------------
// Log event shapes
// ---------------------------------------------------------------------------

export interface CapabilityLogContext {
  capability: DocumentCapability;
  provider: DocumentIntelligenceProvider;
  documentId?: string;
  jobId?: string;
  fileName?: string;
  mimeType?: string;
}

export interface CapabilityLogResult extends CapabilityLogContext {
  durationMs: number;
  status: 'complete' | 'failed' | 'skipped';
  confidence?: number | null;
  /** Any additional structured fields for this event */
  extra?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildPrefix(ctx: CapabilityLogContext): string {
  return `[doc-intel:${ctx.provider}:${ctx.capability}]`;
}

function safeLog(level: 'info' | 'warn' | 'error', ...args: unknown[]): void {
  // Use console by default; swap for a structured logger (pino, winston, etc.)
  // in a future pass by injecting a logger instance via configureDocumentIntelligence.
  if (level === 'info') {
    console.info(...args);
  } else if (level === 'warn') {
    console.warn(...args);
  } else {
    console.error(...args);
  }
}

// ---------------------------------------------------------------------------
// Public logging API
// ---------------------------------------------------------------------------

/**
 * Log the start of a capability call.
 */
export function logCapabilityStart(ctx: CapabilityLogContext): void {
  const { debugLogging } = getDocumentIntelligenceConfig();
  if (!debugLogging) return;
  safeLog('info', buildPrefix(ctx), 'started', {
    documentId: ctx.documentId,
    jobId: ctx.jobId,
    fileName: ctx.fileName,
    mimeType: ctx.mimeType,
  });
}

/**
 * Log the successful completion of a capability call.
 */
export function logCapabilityComplete(result: CapabilityLogResult): void {
  safeLog('info', buildPrefix(result), 'completed', {
    documentId: result.documentId,
    jobId: result.jobId,
    fileName: result.fileName,
    durationMs: result.durationMs,
    confidence: result.confidence ?? undefined,
    ...result.extra,
  });
}

/**
 * Log a capability call failure.
 * The `err` object is included for server-side diagnostics only.
 * Never forward this to client-facing API responses.
 */
export function logCapabilityError(
  ctx: CapabilityLogContext,
  err: unknown,
  durationMs: number,
): void {
  const message = err instanceof Error ? err.message : String(err);
  safeLog('error', buildPrefix(ctx), 'failed', {
    documentId: ctx.documentId,
    jobId: ctx.jobId,
    fileName: ctx.fileName,
    durationMs,
    error: message,
    // Full error object logged only in debug mode
    ...(getDocumentIntelligenceConfig().debugLogging ? { errorDetail: err } : {}),
  });
}

/**
 * Log provider selection.
 */
export function logProviderSelected(
  provider: DocumentIntelligenceProvider,
  capability: DocumentCapability,
  documentId?: string,
): void {
  const { debugLogging } = getDocumentIntelligenceConfig();
  if (!debugLogging) return;
  safeLog('info', `[doc-intel] provider selected`, {
    provider,
    capability,
    documentId,
  });
}
