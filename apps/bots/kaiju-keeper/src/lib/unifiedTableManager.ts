/**
 * Team name mappings and utilities
 * Note: The actual player_stats table structure is managed externally and matches the production schema
 * This file provides team name normalization utilities for database operations
 */

/**
 * Team name mappings to handle historical name changes
 * Maps old team names/abbreviations to current ones
 */
export const TEAM_NAME_MAPPINGS: Record<string, string> = {
  // Historical teams that no longer exist or were relocated/renamed
  'BER': 'BFB', // Berlin Fire Salamanders (keep as is for historical data)
  'CHI': 'OSK', // Chicago Butchers became Osaka Kaiju
  'LVL': 'NOLA', // Las Vegas Legion became New Orleans Second Line  
  'PHI': 'CTC', // Philadelphia Liberty became Cape Town Crash
  'SAN': 'DAL', // San Antonio Marshals became Dallas Birddogs (DSFL)
  'PBS': 'BBB', // Palm Beach Solar Bears became Bondi Beach Buccaneers
  'MBB': 'BBB', // Myrtle Beach Buccaneers became Bondi Beach Buccaneers
  
  // These mappings handle the team relocations/renames found in the scraping utils
  'BERLIN FIRE SALAMANDERS': 'BER',
  'CHICAGO BUTCHERS': 'OSK', 
  'LAS VEGAS LEGION': 'NOLA',
  'PHILADELPHIA LIBERTY': 'CTC',
  'SAN ANTONIO MARSHALS': 'DAL',
  'PALM BEACH SOLAR BEARS': 'BBB',
  'MYRTLE BEACH BUCCANEERS': 'BBB'
};

/**
 * Normalizes team abbreviation to handle name changes
 */
export function normalizeTeamAbbreviation(teamAbbr: string): string {
  return TEAM_NAME_MAPPINGS[teamAbbr.toUpperCase()] || teamAbbr.toUpperCase();
}