import path from 'node:path';
import { promises as fs } from 'node:fs';

const DEFAULT_TEMP_DIR = '/tmp/document-intelligence-service';

export function getTempDirectory(): string {
  const configured = process.env.DOC_INTEL_TEMP_DIR?.trim();
  return configured && configured !== '' ? configured : DEFAULT_TEMP_DIR;
}

export async function ensureTempDirectory(): Promise<string> {
  const tempDir = getTempDirectory();
  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
}

export function resolveStagedPath(fileName: string): string {
  return path.join(getTempDirectory(), fileName);
}
