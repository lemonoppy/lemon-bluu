import fs from 'fs/promises';
import path from 'path';

import { ThreadReport } from './types';

function timestampForFilename(date: Date): string {
  return date
    .toISOString()
    .replaceAll(':', '-')
    .replace(/\.\d{3}Z$/, 'Z');
}

export async function writeReport(
  report: ThreadReport,
  threadId: string,
): Promise<{ reportPath: string; usernamesPath: string }> {
  const outputDirectory = path.resolve(__dirname, '../output');
  const outputBase = `thread-${threadId}-${timestampForFilename(new Date(report.scrapedAt))}`;
  const reportPath = path.join(outputDirectory, `${outputBase}.json`);
  const usernamesPath = path.join(
    outputDirectory,
    `${outputBase}.usernames.txt`,
  );

  await fs.mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`),
    fs.writeFile(
      usernamesPath,
      report.qualifyingUsernames.length > 0
        ? `${report.qualifyingUsernames.join('\n')}\n`
        : '',
    ),
  ]);

  return { reportPath, usernamesPath };
}
