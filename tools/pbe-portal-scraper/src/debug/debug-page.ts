/**
 * Debug script: inspect page structure without login.
 * Open a browser, navigate to the draftees page, and log page structure.
 */
import puppeteer from 'puppeteer';

async function debugPageStructure() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });

  const page = await browser.newPage();

  try {
    console.log('Navigating to player list...');
    await page.goto(
      'https://pbe.simflow.io/view/player_list.php?go_player_list_view_draftees=',
      { waitUntil: 'networkidle2' },
    );

    await new Promise(resolve => setTimeout(resolve, 3000));

    const pageInfo = await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll('a')).map(a => ({
        text: (a as HTMLElement).innerText.trim(),
        href: a.href,
      }));

      const tables = document.querySelectorAll('table');
      const tableData = Array.from(tables).map((table, i) => {
        const rows = Array.from(table.querySelectorAll('tr'));
        return {
          tableIndex: i,
          rowCount: rows.length,
          firstRow: rows[0] ? (rows[0] as HTMLElement).innerText : '',
          sampleRows: rows.slice(0, 5).map(r => (r as HTMLElement).innerText),
        };
      });

      return {
        allLinks: allLinks.slice(0, 20),
        tableData,
        bodyText: document.body.innerText.substring(0, 2000),
      };
    });

    console.log('\n=== PAGE STRUCTURE DEBUG ===\n');
    console.log('Links found:', pageInfo.allLinks);
    console.log('\nTable structure:', JSON.stringify(pageInfo.tableData, null, 2));
    console.log('\nPage text preview:', pageInfo.bodyText);

    console.log('\n\nBrowser will stay open for 30 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 30000));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

debugPageStructure();
