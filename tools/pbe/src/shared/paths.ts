import fs from 'fs';
import path from 'path';

/** Resolves to `tools/pbe` from both `src/shared` (ts-node) and `dist/shared`. */
export const PACKAGE_ROOT = path.resolve(__dirname, '../..');

/** Returns `tools/pbe/data/<tool>`, creating it if needed. */
export function dataDirectory(tool: string): string {
  const directory = path.join(PACKAGE_ROOT, 'data', tool);
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}
