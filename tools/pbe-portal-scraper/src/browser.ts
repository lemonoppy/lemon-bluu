import fs from 'fs';
import os from 'os';
import path from 'path';

import puppeteer, { Browser, Page } from 'puppeteer';

const AUTH_TIMEOUT_MS = 300_000;
const POLL_INTERVAL_MS = 2_000;
const BROWSER_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Vivaldi.app/Contents/MacOS/Vivaldi',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

export interface FetchedText {
  status: number;
  url: string;
  text: string;
}

export interface PortalSession {
  fetchText(url: string): Promise<FetchedText>;
  close(): Promise<void>;
}

function findBrowserExecutable(): string | undefined {
  const configuredPath = process.env.PBE_CHROME_EXECUTABLE;
  if (configuredPath) return configuredPath;

  const homeApplications = BROWSER_PATHS.filter((browserPath) =>
    browserPath.startsWith('/Applications/'),
  ).map((browserPath) =>
    path.join(os.homedir(), browserPath.replace(/^\//, '')),
  );

  return [...BROWSER_PATHS, ...homeApplications].find((browserPath) =>
    fs.existsSync(browserPath),
  );
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Runs `fetch` inside the page so its cookies and user-agent are used. */
async function fetchInPage(page: Page, url: string): Promise<FetchedText> {
  return page.evaluate(async (requestUrl: string) => {
    const response = await fetch(requestUrl, {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    return {
      status: response.status,
      url: response.url,
      text: await response.text(),
    };
  }, url);
}

/**
 * Opens the portal in a persistent, visible Chrome profile and waits until
 * `isReady` accepts the response from `probeUrl`. On the first run, complete
 * any Cloudflare check and log in (tick "remember me") in the opened window;
 * the profile keeps the session for later runs.
 */
export async function openPortalSession(
  entryUrl: string,
  probeUrl: string,
  isReady: (text: string) => boolean,
): Promise<PortalSession> {
  const profileDirectory = path.resolve(__dirname, '../.chrome-profile');
  const browser: Browser = await puppeteer.launch({
    args: ['--disable-blink-features=AutomationControlled'],
    defaultViewport: null,
    executablePath: findBrowserExecutable(),
    headless: false,
    ignoreDefaultArgs: ['--enable-automation'],
    userDataDir: profileDirectory,
  });

  try {
    const pages = await browser.pages();
    const page = pages[0] ?? (await browser.newPage());

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });

    console.log(`Opening ${entryUrl}`);
    await page
      .goto(entryUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 })
      .catch(() => undefined);

    const deadline = Date.now() + AUTH_TIMEOUT_MS;
    let announced = false;

    while (Date.now() < deadline) {
      try {
        const result = await fetchInPage(page, probeUrl);

        if (isReady(result.text)) {
          console.log('Portal session is ready.');
          return {
            fetchText: (url) => fetchInPage(page, url),
            close: () => browser.close(),
          };
        }
      } catch {
        // The page is navigating (login redirect, Cloudflare); keep waiting.
      }

      if (!announced) {
        console.log(
          'Waiting for you to pass the Cloudflare check and log in ' +
            'in the opened browser window...',
        );
        announced = true;
      }
      await sleep(POLL_INTERVAL_MS);
    }

    throw new Error(
      'Not logged in to the portal within 5 minutes. Complete the Cloudflare ' +
        'check and login in the opened browser, then run the command again.',
    );
  } catch (error) {
    await browser.close();
    throw error;
  }
}
