/**
 * document-intelligence-core/providers/llamaCloud/parse.ts
 *
 * Llama Cloud parse capability implementation.
 *
 * Accepts a local file path, uploads it to Llama Cloud via the parsing API,
 * waits for completion, and returns a normalized result. All Llama-specific
 * field names stay inside this file — nothing Llama-specific leaks to callers.
 */

import fs from 'node:fs';
import path from 'node:path';
import { toFile } from '@llamaindex/llama-cloud';
import type { NormalizedParseResult, DocumentSourceInput } from '../../types.js';
import {
  DocumentIntelligenceProviderError,
  DocumentIntelligenceInvalidInputError,
} from '../../errors.js';
import { getLlamaCloudClient, getLlamaCloudProviderConfig } from './client.js';
import { normalizeParseResult } from '../../normalizers/parseNormalizer.js';

// ---------------------------------------------------------------------------
// Supported MIME types
// ---------------------------------------------------------------------------

const SUPPORTED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/tiff',
  'image/bmp',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/html',
  'text/markdown',
]);

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Parse a document using the Llama Cloud Parsing API.
 *
 * Uploads the file, submits a parse job (tier: cost_effective), waits for
 * completion, and returns a NormalizedParseResult. The rawResult field
 * contains the full provider response for debugging and audit; it must not
 * be forwarded to client-facing API responses.
 */
export async function llamaCloudParse(
  input: DocumentSourceInput,
): Promise<NormalizedParseResult> {
  const { filePath, fileName, mimeType } = input;

  // ---- Input validation --------------------------------------------------
  if (!filePath || filePath.trim() === '') {
    throw new DocumentIntelligenceInvalidInputError(
      'filePath is required for parse.',
      { input },
    );
  }

  if (!fs.existsSync(filePath)) {
    throw new DocumentIntelligenceInvalidInputError(
      `File not found at path: ${filePath}`,
      { filePath },
    );
  }

  if (mimeType && !SUPPORTED_MIME_TYPES.has(mimeType)) {
    throw new DocumentIntelligenceInvalidInputError(
      `Unsupported MIME type "${mimeType}" for Llama Cloud parse.`,
      { mimeType, supported: [...SUPPORTED_MIME_TYPES] },
    );
  }

  // ---- Build the uploadable file -----------------------------------------
  const resolvedFileName = fileName ?? path.basename(filePath);
  const fileStream = fs.createReadStream(filePath);
  const uploadable = await toFile(fileStream, resolvedFileName, {
    type: mimeType ?? 'application/octet-stream',
  });

  // ---- Submit parse job --------------------------------------------------
  const client = getLlamaCloudClient();
  const providerConfig = getLlamaCloudProviderConfig();

  let rawResult: unknown;

  try {
    const result = await client.parsing.parse(
      {
        tier: providerConfig.parseTier,
        version: providerConfig.parseVersion as Parameters<typeof client.parsing.parse>[0]['version'],
        upload_file: uploadable,
        expand: ['text', 'markdown'],
        ...(providerConfig.organizationId ? { organization_id: providerConfig.organizationId } : {}),
        ...(providerConfig.projectId ? { project_id: providerConfig.projectId } : {}),
      },
    );

    rawResult = result;
    return normalizeParseResult(result, resolvedFileName);
  } catch (err) {
    if (
      err instanceof DocumentIntelligenceProviderError ||
      (err instanceof Error && err.name.startsWith('DocumentIntelligence'))
    ) {
      throw err;
    }

    throw new DocumentIntelligenceProviderError(
      'llama-cloud',
      err instanceof Error ? err.message : 'Unknown parse error',
      { filePath, fileName: resolvedFileName, rawResult, cause: err },
    );
  }
}
