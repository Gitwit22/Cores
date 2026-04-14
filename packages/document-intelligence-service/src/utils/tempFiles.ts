import path from 'node:path';
import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';

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

const MIME_EXTENSION_MAP: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/tiff': '.tiff',
  'image/bmp': '.bmp',
  'image/webp': '.webp',
  'text/plain': '.txt',
  'text/markdown': '.md',
};

export async function stageUploadedBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  const extension = MIME_EXTENSION_MAP[mimeType] ?? '.bin';
  const stagedFileName = `${randomUUID()}${extension}`;
  const stagedPath = resolveStagedPath(stagedFileName);
  await fs.writeFile(stagedPath, buffer);
  return stagedPath;
}

export function isWithinTempDirectory(filePath: string): boolean {
  const resolvedPath = path.resolve(filePath);
  const tempRoot = path.resolve(getTempDirectory());
  const relativePath = path.normalize(path.relative(tempRoot, resolvedPath));

  return (
    relativePath !== ''
    && relativePath !== '..'
    && !relativePath.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relativePath)
  );
}
