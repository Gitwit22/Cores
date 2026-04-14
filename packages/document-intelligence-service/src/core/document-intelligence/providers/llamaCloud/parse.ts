import fs from 'node:fs';
import path from 'node:path';
import { toFile } from '@llamaindex/llama-cloud';
import type { DocumentSourceInput, NormalizedParseResult } from '../../types.js';
import {
  DocumentIntelligenceInvalidInputError,
  DocumentProviderError,
} from '../../errors.js';
import { getLlamaCloudClient } from './client.js';
import { normalizeParseResult } from '../../normalizers/parseNormalizer.js';

export async function llamaCloudParse(input: DocumentSourceInput): Promise<NormalizedParseResult> {
  if (!input.filePath || input.filePath.trim() === '') {
    throw new DocumentIntelligenceInvalidInputError('A non-empty filePath is required.');
  }
  if (!fs.existsSync(input.filePath)) {
    throw new DocumentIntelligenceInvalidInputError('Uploaded file path does not exist.');
  }

  const fileName = input.fileName ?? path.basename(input.filePath);
  const fileStream = fs.createReadStream(input.filePath);
  const uploadable = await toFile(fileStream, fileName, {
    type: input.mimeType ?? 'application/octet-stream',
  });

  try {
    const client = getLlamaCloudClient();
    const raw = await client.parsing.parse({
      tier: 'cost_effective',
      version: 'latest',
      upload_file: uploadable,
      expand: ['text', 'markdown'],
    });
    return normalizeParseResult(raw);
  } catch (error) {
    throw new DocumentProviderError(
      'llama-cloud',
      error instanceof Error ? error.message : 'Unknown parse provider error',
      { cause: error },
    );
  }
}
