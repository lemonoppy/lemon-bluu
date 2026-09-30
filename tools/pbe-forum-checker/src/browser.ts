import path from 'path';

import puppeteer, { Browser, Page } from 'puppeteer';

import { getThreadPageUrls } from './parser';

const THREAD_SELECTOR = '[id^="post_"] .post_body, [id^="post_"] [id^="pid_"]';
const CLOUDFLARE_TIMEOUT_MS = 180_000;

export interface ScrapedThreadPage {
  html: string;
  pageNumber: number;
  url: string;
}

async function waitForThread(page: Page): Promise<void> {
  try {
    await page.waitForSelector(THREAD_SELECTOR, {
      timeout: CLOUDFLARE_TIMEOUT_MS,
    });
  } catch {
    throw new Error(
      'Thread content did not appear within 3 minutes. Complete any Cloudflare ' +
        'challenge in the opened browser, then run the command again.',
    );
  }
}

function getPageNumber(url: string): number {
  const value = new URL(url).searchParams.get('page');
  return value ? Number.parseInt(value, 10) : 1;
}

export async function scrapeThreadPages(
  threadUrl: string,
  threadId: string,
): Promise<ScrapedThreadPage[]> {
  let browser: Browser | undefined;
  const profileDirectory = path.resolve(__dirname, '../.chrome-profile');
  const executablePath = process.env.PBE_CHROME_EXECUTABLE;

  try {
    browser = await puppeteer.launch({
      args: ['--disable-blink-features=AutomationControlled'],
      channel: executablePath ? undefined : 'chrome',
      defaultViewport: null,
      executablePath,
      headless: false,
      ignoreDefaultArgs: ['--enable-automation'],
      userDataDir: profileDirectory,
    });
    const pages = await browser.pages();
    const page = pages[0] ?? (await browser.newPage());
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });
    const pendingUrls = [threadUrl];
    const visitedUrls = new Set<string>();
    const threadPages: ScrapedThreadPage[] = [];

    while (pendingUrls.length > 0) {
      const nextUrl = pendingUrls.shift();
      if (!nextUrl || visitedUrls.has(nextUrl)) continue;

      console.log(`Loading ${nextUrl}`);
      await page.goto(nextUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      });
      await waitForThread(page);

      const resolvedUrl = page.url();
      const html = await page.content();
      visitedUrls.add(nextUrl);
      threadPages.push({
        html,
        pageNumber: getPageNumber(resolvedUrl),
        url: resolvedUrl,
      });

      for (const paginationUrl of getThreadPageUrls(
        html,
        resolvedUrl,
        threadId,
      )) {
        if (
          !visitedUrls.has(paginationUrl) &&
          !pendingUrls.includes(paginationUrl)
        ) {
          pendingUrls.push(paginationUrl);
        }
      }
    }

    return threadPages.sort(
      (left, right) => left.pageNumber - right.pageNumber,
    );
  } finally {
    await browser?.close();
  }
}
