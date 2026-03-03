/**
 * Debug script: inspect input fields and table headers on the MiLPBE player list.
 */
import fs from 'fs';

import puppeteer from 'puppeteer';

interface Config {
  username: string;
  password: string;
  loginUrl: string;
}

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8')) as Config;

async function debugXPFilter() {
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

    console.log('Navigating to MiLPBE player list...');
    await page.goto('https://pbe.simflow.io/view/player_list.php?league=milpbe', {
      waitUntil: 'networkidle2',
    });
    await new Promise(resolve => setTimeout(resolve, 3000));

    const pageInfo = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const allInputs = inputs.map((input, i) => ({
        index: i,
        type: input.type,
        name: input.name || '',
        id: input.id || '',
        placeholder: input.placeholder || '',
        value: input.value || '',
        className: input.className || '',
        parentText: (input.parentElement?.innerText ?? '').substring(0, 100),
      }));

      const headers = Array.from(document.querySelectorAll('th'));
      const tableHeaders = headers.map((h, i) => ({
        index: i,
        text: h.innerText.trim(),
        hasInput: h.querySelector('input') !== null,
      }));

      const table = document.querySelector('table');
      const tableStructure = table ? table.outerHTML.substring(0, 5000) : '';

      return { allInputs, tableHeaders, tableStructure };
    });

    console.log('\n=== ALL INPUT FIELDS ===');
    console.log(JSON.stringify(pageInfo.allInputs, null, 2));

    console.log('\n\n=== TABLE HEADERS ===');
    console.log(JSON.stringify(pageInfo.tableHeaders, null, 2));

    console.log('\n\n=== TABLE STRUCTURE (first 5000 chars) ===');
    console.log(pageInfo.tableStructure);

    console.log('\n\nBrowser will stay open for 60 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 60000));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

debugXPFilter();
