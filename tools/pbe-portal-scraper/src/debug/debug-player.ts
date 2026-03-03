/**
 * Debug script: inspect a single player page structure.
 */
import fs from 'fs';

import puppeteer from 'puppeteer';

interface Config {
  username: string;
  password: string;
  loginUrl: string;
}

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8')) as Config;

async function debugPlayerPage() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });

  const page = await browser.newPage();

  try {
    console.log('Logging in...');
    await page.goto(config.loginUrl, { waitUntil: 'networkidle2' });
    await page.type('input[name="username"], input[type="text"]', config.username);
    await page.type('input[name="password"], input[type="password"]', config.password);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('input[type="submit"], button[type="submit"]'),
    ]);

    console.log('Navigating to player page...');
    await page.goto('https://pbe.simflow.io/forms/player_page.php?pid=501', {
      waitUntil: 'networkidle2',
    });

    const pageData = await page.evaluate(() => {
      return {
        bodyText: document.body.innerText,
        tables: Array.from(document.querySelectorAll('table')).map((table, i) => ({
          index: i,
          text: (table as HTMLElement).innerText.substring(0, 500),
        })),
        labels: Array.from(
          document.querySelectorAll('label, th, td, b, strong'),
        )
          .map(el => (el as HTMLElement).innerText.trim())
          .filter(t => t.length > 0 && t.length < 100),
      };
    });

    console.log('\n=== PAGE TEXT (first 2000 chars) ===');
    console.log(pageData.bodyText.substring(0, 2000));

    console.log('\n\n=== TABLES ===');
    console.log(JSON.stringify(pageData.tables, null, 2));

    console.log('\n\n=== LABELS/HEADINGS ===');
    console.log(JSON.stringify(pageData.labels.slice(0, 50), null, 2));

    console.log('\n\nKeeping browser open for 60 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 60000));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

debugPlayerPage();
