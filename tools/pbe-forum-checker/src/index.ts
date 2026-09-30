import 'dotenv/config';

import fs from 'fs/promises';
import path from 'path';

import { reviewEligiblePosts } from './ai';
import { scrapeThreadPages } from './browser';
import {
  evaluatePosts,
  getQualifyingUsernames,
  parseThreadPage,
} from './parser';
import { writeReport } from './report';
import { ThreadReport } from './types';

interface CliOptions {
  enableAi: boolean;
  threadId: string;
  threadUrl: string;
}

function usage(): never {
  console.error('Usage: yarn scrape <pbe-forum-thread-url> [--ai]');
  console.error(
    'Example: yarn scrape "https://forum.pbesim.com/showthread.php?tid=44287" --ai',
  );
  process.exit(1);
}

function parseOptions(arguments_: string[]): CliOptions {
  const enableAi = arguments_.includes('--ai');
  const positionalArguments = arguments_.filter(
    (argument) => argument !== '--ai',
  );
  if (positionalArguments.length !== 1) usage();

  let url: URL;
  try {
    url = new URL(positionalArguments[0]);
  } catch {
    throw new Error('The thread URL is not valid.');
  }

  const threadId = url.searchParams.get('tid');
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'forum.pbesim.com' ||
    url.pathname !== '/showthread.php' ||
    !threadId ||
    !/^\d+$/.test(threadId)
  ) {
    throw new Error(
      'URL must be an HTTPS forum.pbesim.com/showthread.php URL with a numeric tid.',
    );
  }

  const normalizedUrl = new URL('/showthread.php', url.origin);
  normalizedUrl.searchParams.set('tid', threadId);

  return {
    enableAi,
    threadId,
    threadUrl: normalizedUrl.toString(),
  };
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  if (options.enableAi && !process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is required when --ai is supplied.');
  }

  const pages = await scrapeThreadPages(options.threadUrl, options.threadId);
  const parsedPosts = pages.flatMap((page) =>
    parseThreadPage(page.html, page.url),
  );
  if (parsedPosts.length === 0) {
    const outputDirectory = path.resolve(__dirname, '../output');
    const debugPath = path.join(
      outputDirectory,
      `thread-${options.threadId}-debug.html`,
    );
    await fs.mkdir(outputDirectory, { recursive: true });
    await fs.writeFile(debugPath, pages[0]?.html ?? '');

    throw new Error(
      `Loaded ${pages.length} thread page(s), but could not parse any posts. ` +
        `The first page HTML was saved to ${debugPath}.`,
    );
  }

  let posts = evaluatePosts(parsedPosts);
  if (options.enableAi) {
    posts = await reviewEligiblePosts(posts);
  }
  const qualifyingUsernames = getQualifyingUsernames(posts);
  const report: ThreadReport = {
    threadUrl: options.threadUrl,
    scrapedAt: new Date().toISOString(),
    qualifyingUsernames,
    posts,
  };
  const paths = await writeReport(report, options.threadId);

  console.log(`\nFound ${qualifyingUsernames.length} qualifying usernames:`);
  console.log(
    qualifyingUsernames.length > 0 ? qualifyingUsernames.join('\n') : '(none)',
  );
  console.log(`\nUsername list: ${paths.usernamesPath}`);
  console.log(`Audit report: ${paths.reportPath}`);
}

main().catch((error) => {
  console.error(`Error: ${(error as Error).message}`);
  process.exitCode = 1;
});
