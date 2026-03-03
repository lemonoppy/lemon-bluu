/**
 * Debug script: log XP value distribution across all players.
 */
import fs from 'fs';

import puppeteer from 'puppeteer';

interface Config {
  username: string;
  password: string;
  loginUrl: string;
}

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8')) as Config;

async function debugAllXP() {
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

    console.log('Navigating to player list (no filters)...');
    await page.goto(
      'https://pbe.simflow.io/view/player_list.php?league=MiLPBE&retired=Exclude&filler=Exclude',
      { waitUntil: 'networkidle2' },
    );
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('Extracting all player XP values...');

    let allPlayers: { name: string; xp: string }[] = [];
    let pageNum = 1;
    let hasMore = true;

    while (hasMore && pageNum <= 10) {
      const playersOnPage = await page.evaluate(() => {
        const players: { name: string; xp: string }[] = [];
        const rows = Array.from(document.querySelectorAll('table tbody tr'));

        rows.forEach(row => {
          if ((row as HTMLElement).offsetHeight === 0) return;

          const cells = row.querySelectorAll('td');
          if (cells.length > 0) {
            const nameCell = row.querySelector('td a[href*="player_page.php"]');
            const name = nameCell ? (nameCell as HTMLElement).innerText.trim() : 'Unknown';

            let xp = 'NOT_FOUND';
            cells.forEach(cell => {
              const text = (cell as HTMLElement).innerText.trim();
              if (/^\d{1,2}$/.test(text) && parseInt(text) <= 10) {
                xp = text;
              }
            });

            players.push({ name, xp });
          }
        });

        return players;
      });

      console.log(`Page ${pageNum}: Found ${playersOnPage.length} players`);
      allPlayers = allPlayers.concat(playersOnPage);

      const clicked = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a')) as HTMLElement[];
        const nextLink = links.find(
          a =>
            a.innerText.trim() === '>' ||
            a.innerText.trim() === '›' ||
            a.innerText.trim().toLowerCase() === 'next',
        );
        if (nextLink && !nextLink.classList.contains('disabled')) {
          nextLink.click();
          return true;
        }
        return false;
      });

      if (clicked) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        pageNum++;
      } else {
        hasMore = false;
      }
    }

    const xpCounts: Record<string, number> = {};
    allPlayers.forEach(p => {
      xpCounts[p.xp] = (xpCounts[p.xp] ?? 0) + 1;
    });

    console.log('\n=== XP Value Distribution ===');
    Object.keys(xpCounts)
      .sort()
      .forEach(xp => {
        console.log(`XP ${xp}: ${xpCounts[xp]} players`);
      });

    console.log(`\nTotal players: ${allPlayers.length}`);
    console.log(`Players with XP=1: ${xpCounts['1'] ?? 0}`);

    console.log('\n=== First 10 players with XP=1 ===');
    allPlayers
      .filter(p => p.xp === '1')
      .slice(0, 10)
      .forEach(p => {
        console.log(`  - ${p.name} (XP: ${p.xp})`);
      });

    console.log('\n\nBrowser will stay open for 60 seconds...');
    await new Promise(resolve => setTimeout(resolve, 60000));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

debugAllXP();
