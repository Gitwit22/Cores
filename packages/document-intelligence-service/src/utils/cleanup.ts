import { promises as fs } from 'node:fs';
import path from 'node:path';
import { isWithinTempDirectory } from './tempFiles.js';

export async function cleanupFile(filePath?: string): Promise<void> {
  if (!filePath) {
    return;
  }

  if (!isWithinTempDirectory(filePath)) {
    return;
  }
  const resolvedPath = path.resolve(filePath);

  try {
    await fs.unlink(resolvedPath);
  } catch {
    // ignore cleanup failures for ephemeral staging files
  }
}

export async function cleanupFiles(filePaths: readonly string[]): Promise<void> {
  await Promise.all(filePaths.map((filePath) => cleanupFile(filePath)));
}
