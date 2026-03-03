/**
 * Debug script: inspect how bootstrap-table hides rows after XP filter is applied.
 */
import fs from 'fs';

import puppeteer from 'puppeteer';

interface Config {
  username: string;
  password: string;
  loginUrl: string;
}

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8')) as Config;

async function debugFilterMethod() {
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

    console.log('Navigating to player list...');
    await page.goto(
      'https://pbe.simflow.io/view/player_list.php?league=MiLPBE&retired=Exclude&filler=Exclude',
      { waitUntil: 'networkidle2' },
    );
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n=== BEFORE FILTER ===');
    const beforeInfo = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      const firstRow = rows[0] as HTMLElement | undefined;
      return {
        totalRows: rows.length,
        sampleRow: firstRow
          ? {
              className: firstRow.className,
              style: firstRow.getAttribute('style'),
              computedDisplay: window.getComputedStyle(firstRow).display,
            }
          : null,
      };
    });
    console.log(JSON.stringify(beforeInfo, null, 2));

    console.log('\nApplying XP filter...');
    await page.waitForSelector('.bootstrap-table-filter-control-experience');
    await page.evaluate(() => {
      const xpInput = document.querySelector(
        '.bootstrap-table-filter-control-experience',
      ) as HTMLInputElement | null;
      if (xpInput) xpInput.value = '';
    });
    await page.click('.bootstrap-table-filter-control-experience');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.type('.bootstrap-table-filter-control-experience', '1');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\n=== AFTER FILTER ===');
    const afterInfo = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));

      const analysis = rows.slice(0, 10).map((row, i) => {
        const el = row as HTMLElement;
        return {
          index: i,
          className: el.className,
          style: el.getAttribute('style'),
          hidden: el.hidden,
          ariaHidden: el.getAttribute('aria-hidden'),
          dataIndex: el.getAttribute('data-index'),
          computedDisplay: window.getComputedStyle(el).display,
          computedVisibility: window.getComputedStyle(el).visibility,
          offsetHeight: el.offsetHeight,
          offsetWidth: el.offsetWidth,
          innerHTML: el.innerHTML.substring(0, 100),
        };
      });

      return { totalRows: rows.length, sampleRows: analysis };
    });
    console.log(JSON.stringify(afterInfo, null, 2));

    console.log('\n\nBrowser will stay open for 60 seconds...');
    await new Promise(resolve => setTimeout(resolve, 60000));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

debugFilterMethod();
