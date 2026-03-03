import fs from 'fs';

import puppeteer from 'puppeteer';

interface Config {
  username: string;
  password: string;
  loginUrl: string;
}

interface PlayerData {
  pid: string;
  username: string;
  name: string;
  position: string;
  archetype: string;
  tpe: string;
  bankAccount: string;
  team: string;
  experience?: string;
}

// Load credentials from config.json
let config: Config;
try {
  config = JSON.parse(fs.readFileSync('./config.json', 'utf8')) as Config;
} catch {
  console.error('Error: config.json not found. Please create it from config.example.json');
  console.error('Copy config.example.json to config.json and add your credentials.');
  process.exit(1);
}

// Configuration
const SEASON = 60;
const PLAYER_LIST_URL =
  'https://pbe.simflow.io/view/player_list.php?league=MiLPBE&retired=Exclude&filler=Exclude';
const OUTPUT_FILE = `drafted-players-s${SEASON}.json`;

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

async function scrapePlayerData(): Promise<PlayerData[]> {
  console.log(`Starting scraper for Season ${SEASON}...`);

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
  });

  try {
    const page = await browser.newPage();

    // Login
    console.log('Logging in...');
    await page.goto(config.loginUrl, { waitUntil: 'networkidle2' });
    await page.type('input[name="username"], input[type="text"]', config.username);
    await page.type('input[name="password"], input[type="password"]', config.password);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('input[type="submit"], button[type="submit"]'),
    ]);

    console.log('Login successful!');
    await sleep(2000);

    // Navigate to player list
    console.log('Navigating to player list...');
    await page.goto(PLAYER_LIST_URL, { waitUntil: 'networkidle2' });
    await sleep(2000);

    // Apply XP filter
    console.log('Applying XP filter (value: 1)...');
    await page.waitForSelector('.bootstrap-table-filter-control-experience');

    await page.evaluate(() => {
      const xpInput = document.querySelector(
        '.bootstrap-table-filter-control-experience',
      ) as HTMLInputElement | null;
      if (xpInput) {
        xpInput.value = '1';
        xpInput.dispatchEvent(new Event('keyup', { bubbles: true }));
        xpInput.dispatchEvent(new Event('change', { bubbles: true }));

         
        const win = window as any;
        const $table = win.jQuery && win.jQuery('table').first();
        if ($table && $table.bootstrapTable) {
          $table.bootstrapTable('filterBy', {}, { filterAlgorithm: 'and' });
        }
      }
    });

    console.log('Waiting for table to filter...');
    await sleep(3000);

    // Get player links with pagination
    console.log('Extracting player links from all pages...');
    const allPlayerLinks: string[] = [];
    const seenPaginationStates = new Set<string>();
    let pageNum = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      console.log(`  - Page ${pageNum}...`);

      const currentPaginationInfo = await page.evaluate(() => {
        const paginationInfo = document.querySelector('.page-info, .pagination-info');
        return paginationInfo ? (paginationInfo as HTMLElement).innerText.trim() : '';
      });

      if (currentPaginationInfo) {
        if (seenPaginationStates.has(currentPaginationInfo)) {
          console.log(
            `    Detected loop - already seen: "${currentPaginationInfo}". Stopping pagination.`,
          );
          break;
        }
        seenPaginationStates.add(currentPaginationInfo);
        console.log(`    Pagination: ${currentPaginationInfo}`);
      }

      const pageLinks = await page.evaluate(() => {
        const links: string[] = [];
        const rows = Array.from(document.querySelectorAll('table tbody tr'));

        rows.forEach(row => {
          if ((row as HTMLElement).offsetHeight === 0) return;

          const nameCell = row.querySelector('td a[href*="player_page.php"]');
          if (nameCell) {
            const href = nameCell.getAttribute('href');
            if (href) {
              const cleanHref = href.replace('../forms/', '').replace('/forms/', '');
              links.push('https://pbe.simflow.io/forms/' + cleanHref);
            }
          }
        });

        return links;
      });

      console.log(`    Found ${pageLinks.length} players on this page`);

      pageLinks.forEach(link => {
        if (!allPlayerLinks.includes(link)) {
          allPlayerLinks.push(link);
        }
      });

      const nextPageInfo = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a, button')) as HTMLElement[];
        const nextLink = links.find(
          a =>
            a.innerText.trim().toLowerCase() === 'next' ||
            a.innerText.trim() === '>' ||
            a.innerText.trim() === '»' ||
            a.innerText.trim() === '›',
        );

        if (nextLink) {
          const isDisabled =
            nextLink.classList.contains('disabled') ||
            (nextLink as HTMLButtonElement).disabled;
          if (!isDisabled) {
            nextLink.click();
            return { clicked: true };
          }
          return { clicked: false };
        }
        return { clicked: false };
      });

      if (nextPageInfo.clicked) {
        await sleep(2000);
        pageNum++;
      } else {
        hasMorePages = false;
      }
    }

    console.log(
      `\nFound ${allPlayerLinks.length} total unique players across ${pageNum} page(s)\n`,
    );

    const draftedPlayers: PlayerData[] = [];

    for (let i = 0; i < allPlayerLinks.length; i++) {
      const playerUrl = allPlayerLinks[i];
      console.log(`\nProcessing player ${i + 1}/${allPlayerLinks.length}: ${playerUrl}`);

      try {
        await page.goto(playerUrl, { waitUntil: 'networkidle2' });
        await sleep(1000);

        console.log('  - Extracting player data...');

        const playerData = await page.evaluate(() => {
          const getInputValue = (labelText: string): string => {
            const spans = Array.from(document.querySelectorAll('span.input-group-text'));
            for (const span of spans) {
              if ((span as HTMLElement).innerText.trim() === labelText) {
                const inputGroup = span.closest('.input-group');
                if (inputGroup) {
                  const input = inputGroup.querySelector('input.form-control') as HTMLInputElement | null;
                  if (input) return input.value || '';
                }
              }
            }
            return '';
          };

          return {
            pid: getInputValue('ID'),
            username: getInputValue('Username'),
            name: getInputValue('Name'),
            position: getInputValue('Position(s)'),
            archetype: getInputValue('Archetype'),
            tpe: getInputValue('TPE'),
            team: getInputValue('Team'),
            experience: getInputValue('Experience'),
          };
        });

        if (playerData.experience !== '1') {
          console.log(`  - Skipping: XP is ${playerData.experience}, not 1`);
          continue;
        }

        console.log('  - Extracting bank account from Finances tab...');
        let bankAccount = '';

        try {
          const tabs = await page.$$('a, button');
          let financesClicked = false;

          for (const tab of tabs) {
            const text = await page.evaluate(el => (el as HTMLElement).innerText, tab);
            if (text && text.toLowerCase().includes('finance')) {
              await tab.click();
              await sleep(1500);
              financesClicked = true;
              break;
            }
          }

          if (financesClicked) {
            bankAccount = await page.evaluate(() => {
              const getInputValue = (labelText: string): string => {
                const spans = Array.from(document.querySelectorAll('span.input-group-text'));
                for (const span of spans) {
                  if ((span as HTMLElement).innerText.trim() === labelText) {
                    const inputGroup = span.closest('.input-group');
                    if (inputGroup) {
                      const input = inputGroup.querySelector('input.form-control') as HTMLInputElement | null;
                      if (input) return input.value || '';
                    }
                  }
                }
                return '';
              };
              return getInputValue('Bank Account');
            });
          } else {
            console.log('  - Warning: Could not find Finances tab');
          }
        } catch (error) {
          console.log('  - Error accessing Finances tab:', (error as Error).message);
        }

        const orderedPlayerData: PlayerData = {
          pid: playerData.pid,
          username: playerData.username,
          name: playerData.name,
          position: playerData.position,
          archetype: playerData.archetype,
          tpe: playerData.tpe,
          bankAccount,
          team: playerData.team,
        };

        draftedPlayers.push(orderedPlayerData);
        console.log('  - Extracted:', JSON.stringify(orderedPlayerData, null, 2));
      } catch (error) {
        console.error(`  - Error processing player: ${(error as Error).message}`);
      }
    }

    // Sort by PID ascending
    draftedPlayers.sort((a, b) => parseInt(a.pid) - parseInt(b.pid));

    console.log(`\n\nScraping complete! Found ${draftedPlayers.length} players drafted in S${SEASON}`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(draftedPlayers, null, 2));
    console.log(`Results saved to ${OUTPUT_FILE}`);

    return draftedPlayers;
  } catch (error) {
    console.error('Error during scraping:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

scrapePlayerData()
  .then(players => {
    console.log('\n✓ Scraping completed successfully');
    console.log(`Total players: ${players.length}`);
  })
  .catch(error => {
    console.error('\n✗ Scraping failed:', error);
    process.exit(1);
  });
