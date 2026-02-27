// @ts-ignore - jsdom types not available
import { JSDOM } from 'jsdom';

export interface SeasonGameData {
  id: string;
  week: number;
}

/**
 * Get DSFL Season 58 game IDs and week mappings by scraping GameResults.html
 */
export const getSeasonGameDataDSFL = async (includePostseason: boolean = true): Promise<SeasonGameData[]> => {
  const url = 'https://index.sim-football.com/DSFLS58/GameResults.html';

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Chrome/47.0.2526.111' }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch DSFL game results: ${response.statusText}`);
    }

    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // DSFL Season 58 configuration
    const gpwk = 7; // Games per week
    const wks = 16; // Regular season weeks
    // postseason = 7 games (unused but kept for documentation)

    // Generate week list
    const wkList: number[] = [];
    for (let week = 1; week <= wks; week++) {
      for (let game = 0; game < gpwk; game++) {
        wkList.push(week);
      }
    }

    // Add postseason weeks
    for (let i = 0; i < 4; i++) {
      wkList.push(wks + 1); // Wild card
    }
    for (let i = 0; i < 3; i++) {
      wkList.push(wks + 2); // Conference championships
    }
    wkList[wkList.length - 1] = wks + 3; // Championship game

    // Look for week headers with the specific structure: <a name="N">Week N</a> and <a name="Playoffs">Playoffs</a>
    const weekHeaders: Array<{ week: number; element: any }> = [];

    // First, look for anchor tags with name attributes that are numbers or "Playoffs"
    const anchorElements = document.querySelectorAll('a[name]');
    anchorElements.forEach((anchor: any) => {
      const nameAttr = anchor.getAttribute('name');
      const text = anchor.textContent?.trim() || '';

      // Check if name is a number and text contains "Week N" where N matches the name
      if (nameAttr && /^\d+$/.test(nameAttr)) {
        const weekNum = parseInt(nameAttr);
        const weekPattern = new RegExp(`Week\\s+${weekNum}`, 'i');
        if (weekPattern.test(text) && weekNum >= 1) {
          weekHeaders.push({ week: weekNum, element: anchor });
        }
      }
      // Check for playoffs section
      else if (nameAttr === 'Playoffs' && text.toLowerCase().includes('playoffs')) {
        weekHeaders.push({ week: 999, element: anchor });
      }
    });

    // If no headers found, fallback to searching for any "Week N" text
    if (weekHeaders.length === 0) {
      const allElements = document.querySelectorAll('*');
      allElements.forEach((element: any) => {
        const text = element.textContent?.trim() || '';
        const weekMatch = text.match(/^Week\s+(\d+)/i);
        if (weekMatch) {
          const weekNum = parseInt(weekMatch[1]);
          if (weekNum >= 1) {
            weekHeaders.push({ week: weekNum, element });
          }
        }
      });
    }

    // Extract all game links
    const gameLinks = document.querySelectorAll('a[href*="Logs"]');
    const gameElements: Array<{ id: string; element: any }> = [];

    gameLinks.forEach((link: any) => {
      const href = link.getAttribute('href');
      if (href) {
        // Extract game ID from href (format: Logs/{gameId}.html or Logs/?id={gameId})
        let gameId: string;
        if (href.includes('=')) {
          // New format: Logs/?id={gameId}
          gameId = href.substring(5).split('=').pop() || '';
        } else {
          // Old format: Logs/{gameId}.html
          gameId = href.substring(5).replace('.html', '');
        }
        gameElements.push({ id: gameId, element: link });
      }
    });

    // Map games to weeks by finding which week header they fall under
    const gameToWeekMap: { [gameId: string]: number } = {};

    if (weekHeaders.length > 0) {
      // Sort headers by DOM order to handle playoff games correctly
      weekHeaders.sort((a, b) => {
        const position = a.element.compareDocumentPosition(b.element);
        return (position & 4) ? -1 : 1; // a comes before b if b follows a
      });

      gameElements.forEach(game => {
        // Find the closest preceding week header
        let assignedWeek = 0; // Default for preseason

        weekHeaders.forEach(header => {
          // Compare DOM position - if game comes after this week header
          const position = header.element.compareDocumentPosition(game.element);
          // Use the numeric constant directly (4 = DOCUMENT_POSITION_FOLLOWING)
          if (position & 4) {
            // Game comes after this week header, so it could belong to this week
            if (header.week === 999) {
              // This is a playoff game - will assign specific playoff week numbers later
              assignedWeek = 999; // Fallback, in case of errors
            } else {
              assignedWeek = header.week;
            }
          }
        });

        gameToWeekMap[game.id] = assignedWeek;
      });
    } else {
      // No week headers found, use raw numbering fallback
      gameElements.forEach((game, index) => {
        gameToWeekMap[game.id] = Math.min(16, Math.max(1, Math.floor(index / 7) + 1));
      });
    }

    // Handle playoff games specifically
    const playoffGames = Object.entries(gameToWeekMap)
      .filter(([, week]) => week === 999)
      .sort(([a], [b]) => Number(a) - Number(b));

    // Assign specific playoff weeks based on position
    playoffGames.forEach(([gameId], index) => {
      const gameNumber = index + 1; // 1-indexed

      if (gameNumber === 1 || gameNumber === 3) {
        gameToWeekMap[gameId] = 0; // Bye week
      } else if (gameNumber === 2 || gameNumber === 4) {
        gameToWeekMap[gameId] = 17; // First round
      } else if (gameNumber === 5 || gameNumber === 6) {
        gameToWeekMap[gameId] = 18; // Second round
      } else if (gameNumber === 7) {
        gameToWeekMap[gameId] = 19; // Championship
      }
    });

    // Filter games based on weeks (skip preseason)
    let relevantGames: Array<{ id: string; week: number }> = [];

    Object.entries(gameToWeekMap).forEach(([gameId, week]) => {
      if (includePostseason) {
        // Include all games with week >= 1 (regular season + postseason, skip playoff byes)
        if (week >= 1) {
          relevantGames.push({ id: gameId, week });
        }
      } else {
        // Include only regular season games (weeks 1-16)
        if (week >= 1 && week <= 16) {
          relevantGames.push({ id: gameId, week });
        }
      }
    });

    // Sort by game ID to maintain order
    relevantGames.sort((a, b) => Number(a.id) - Number(b.id));

    // Convert to the expected SeasonGameData format
    return relevantGames.map(game => ({
      id: game.id,
      week: game.week
    }));

  } catch (error) {
    throw new Error(`Failed to get DSFL season game data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
