// @ts-ignore - jsdom types not available
import { JSDOM } from 'jsdom';

export interface SeasonGameData {
  id: string;
  week: number;
}

/**
 * Get season game IDs and week mappings by scraping GameResults.html
 */
export const getSeasonGameData = async (season: number, includePostseason: boolean = true): Promise<SeasonGameData[]> => {
  const seasonStr = season < 10 ? `0${season}` : season.toString();
  const url = season < 24
    ? `http://sim-football.com/indexes/NSFLS${seasonStr}/GameResults.html`
    : `https://index.sim-football.com/ISFLS${season}/GameResults.html`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Chrome/47.0.2526.111' }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch game results: ${response.statusText}`);
    }
    
    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Get game configuration based on season
    let postseason: number, gpwk: number, wks: number;

    if (season > 24) {
      postseason = 7;
    } else if (season > 21) {
      postseason = 7;
    } else if (season > 15) {
      postseason = 7;
    } else if (season > 1) {
      postseason = 3;
    } else {
      postseason = 3;
    }

    if (season < 2) {
      gpwk = 3;
    } else if (season <= 15) {
      gpwk = 4;
    } else if (season <= 21) {
      gpwk = 5;
    } else if (season <= 24) {
      gpwk = 6;
    } else {
      gpwk = 7;
    }
    
    if (season <= 15) {
      wks = 14;
    } else if (season <= 22) {
      wks = 13;
    } else {
      wks = 16;
    }
    
    // Generate week list
    const wkList: number[] = [];
    for (let week = 1; week <= wks; week++) {
      for (let game = 0; game < gpwk; game++) {
        wkList.push(week);
      }
    }
    
    // Handle special case for season 2
    if (season === 2) {
      // Special week configuration for season 2 (from Python script)
      const specialWeeks = [
        1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,6,6,6,6,7,7,7,7,
        8,8,8,8,9,9,9,10,10,10,10,11,11,11,11,12,12,12,12,13,13,13,13,14,14,14,15,15
      ];
      wkList.splice(0, wkList.length, ...specialWeeks);
    }
    
    // Add postseason weeks
    if (season <= 15) {
      for (let i = 0; i < postseason; i++) {
        wkList.push(wks + 1);
      }
      wkList[wkList.length - 1] = wks + 2;
    } else {
      for (let i = 0; i < 4; i++) {
        wkList.push(wks + 1);
      }
      for (let i = 0; i < 3; i++) {
        wkList.push(wks + 2);
      }
      wkList[wkList.length - 1] = wks + 3;
    }
    
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
        let gameId: string;
        if (season < 27) {
          gameId = href.substring(5).replace('.html', '');
        } else {
          gameId = href.substring(5).split('=').pop() || '';
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
              // This is a playoff game - we need to assign actual playoff week numbers
              // Special playoff structure: games 1,3 = (byes), games 2,4 = week 17, games 5,6 = week 18, game 7 = week 19
              assignedWeek = 999; // Fallback, in case of errrors
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
        gameToWeekMap[gameId] = 19; // Ultimus
      }
    });

    // Filter games based on weeks (skip preseason)
    const relevantGames: Array<{ id: string; week: number }> = [];
    
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
    throw new Error(`Failed to get season game data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};