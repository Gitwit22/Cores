import { promises as fs } from 'node:fs';

export async function cleanupFile(filePath?: string): Promise<void> {
  if (!filePath) {
    return;
  }

  try {
    await fs.unlink(filePath);
  } catch {
    // ignore cleanup failures for ephemeral staging files
  }
}

export async function cleanupFiles(filePaths: readonly string[]): Promise<void> {
  await Promise.all(filePaths.map((filePath) => cleanupFile(filePath)));
}
