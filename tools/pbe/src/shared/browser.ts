import fs from 'fs';
import os from 'os';
import path from 'path';

import puppeteer, { Browser, Page } from 'puppeteer';

import { PACKAGE_ROOT } from './paths';

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

export interface LaunchedBrowser {
  browser: Browser;
  page: Page;
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

/**
 * Launches a visible Chrome with a persistent profile at
 * `tools/pbe/.chrome-profile/<profileName>` so Cloudflare clearance and
 * logins survive between runs.
 */
export async function launchBrowser(
  profileName: string,
): Promise<LaunchedBrowser> {
  const browser = await puppeteer.launch({
    args: ['--disable-blink-features=AutomationControlled'],
    defaultViewport: null,
    executablePath: findBrowserExecutable(),
    headless: false,
    ignoreDefaultArgs: ['--enable-automation'],
    userDataDir: path.join(PACKAGE_ROOT, '.chrome-profile', profileName),
  });

  try {
    const pages = await browser.pages();
    const page = pages[0] ?? (await browser.newPage());
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });
    return { browser, page };
  } catch (error) {
    await browser.close();
    throw error;
  }
}
