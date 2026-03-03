/**
 * Debug script: inspect how target label/value pairs are structured on a player page.
 */
import fs from 'fs';

import puppeteer from 'puppeteer';

interface Config {
  username: string;
  password: string;
  loginUrl: string;
}

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8')) as Config;

async function debugTableStructure() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });

  const page = await browser.newPage();

  try {
    await page.goto(config.loginUrl, { waitUntil: 'networkidle2' });
    await page.type('input[name="username"], input[type="text"]', config.username);
    await page.type('input[name="password"], input[type="password"]', config.password);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('input[type="submit"], button[type="submit"]'),
    ]);

    await page.goto('https://pbe.simflow.io/forms/player_page.php?pid=501', {
      waitUntil: 'networkidle2',
    });

    const tableInfo = await page.evaluate(() => {
      const results: unknown[] = [];
      const labels = ['Username', 'Name', 'Position(s)', 'Team', 'Archetype', 'Bank Account'];
      const selectors = ['td', 'th', 'label', 'b', 'strong'];

      selectors.forEach(selector => {
        const elements = Array.from(document.querySelectorAll(selector));

        elements.forEach(el => {
          const text = (el as HTMLElement).innerText.trim();
          if (labels.includes(text)) {
            const parent = el.parentElement;
            const siblings = parent ? Array.from(parent.children) : [];
            const elIndex = siblings.indexOf(el);

            const grandparent = parent ? parent.parentElement : null;
            const parentSiblings = grandparent ? Array.from(grandparent.children) : [];
            const parentIndex = parentSiblings.indexOf(parent as Element);

            results.push({
              selector,
              label: text,
              nextSibling: siblings[elIndex + 1]
                ? (siblings[elIndex + 1] as HTMLElement).innerText.trim().substring(0, 100)
                : 'NO NEXT SIBLING',
              parentTag: parent ? parent.tagName : 'NO PARENT',
              parentNextSibling: parentSiblings[parentIndex + 1]
                ? (parentSiblings[parentIndex + 1] as HTMLElement).innerText.trim().substring(0, 100)
                : 'NO PARENT NEXT SIBLING',
              grandparentTag: grandparent ? grandparent.tagName : 'NO GRANDPARENT',
              grandparentChildren: grandparent
                ? Array.from(grandparent.children).map(c =>
                    (c as HTMLElement).innerText.trim().substring(0, 50),
                  )
                : [],
            });
          }
        });
      });

      return results;
    });

    console.log('\n=== TABLE CELL STRUCTURE ===\n');
    console.log(JSON.stringify(tableInfo, null, 2));

    console.log('\n\nKeeping browser open for 30 seconds...');
    await new Promise(resolve => setTimeout(resolve, 30000));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

debugTableStructure();
