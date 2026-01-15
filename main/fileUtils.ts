import * as fs from 'fs/promises';
import * as path from 'path';
import { createWriteStream } from 'fs';
// @ts-ignore - archiver types are defined in main/types.d.ts
import archiver from 'archiver';
// @ts-ignore - extract-zip types are defined in main/types.d.ts
import extractZip from 'extract-zip';

export async function calculateDirSize(dirPath: string): Promise<number> {
  let size = 0;
  try {
    const stats = await fs.stat(dirPath);
    if (stats.isFile()) {
      return stats.size;
    }

    const entries = await fs.readdir(dirPath);
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry);
      size += await calculateDirSize(entryPath);
    }
  } catch {
    // Ignore errors
  }
  return size;
}

export async function zipDirectory(sourcePath: string, zipPath: string): Promise<number> {
  return new Promise(async (resolve, reject) => {
    try {
      const output = createWriteStream(zipPath);
      const archive = (archiver as any)('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        fs.stat(zipPath)
          .then((stats) => resolve(stats.size))
          .catch(reject);
      });

      archive.on('error', reject);
      archive.pipe(output);

      const stats = await fs.stat(sourcePath);
      if (stats.isDirectory()) {
        archive.directory(sourcePath, false);
      } else {
        archive.file(sourcePath, { name: path.basename(sourcePath) });
      }

      archive.finalize();
    } catch (error) {
      reject(error);
    }
  });
}

export async function unzipFile(zipPath: string, destDir: string): Promise<void> {
  await fs.mkdir(destDir, { recursive: true });
  await extractZip(zipPath, { dir: destDir });
}

export async function copyDirectory(source: string, dest: string): Promise<void> {
  const stats = await fs.stat(source);
  if (stats.isDirectory()) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(source);
    for (const entry of entries) {
      const sourcePath = path.join(source, entry);
      const destPath = path.join(dest, entry);
      await copyDirectory(sourcePath, destPath);
    }
  } else {
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(source, dest);
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
