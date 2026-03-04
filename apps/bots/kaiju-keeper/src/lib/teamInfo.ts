import { TeamConfig } from 'src/lib/config/config';
import { Teams, findTeamByName } from 'src/lib/teams';
import { Team } from 'typings/portal';

// Cache teams by guild ID and search key to avoid repeated lookups
const teamCache: Map<string, Team> = new Map();

// Find team by search key (name, abbreviation, location, or ID)
function findTeamBySearchKey(searchKey: string): Team | null {
  const key = searchKey.toLowerCase();
  
  // Try to find by ID first
  const byId = parseInt(key);
  if (!isNaN(byId)) {
    const team = Object.values(Teams).find(t => t.id === byId);
    if (team) return team;
  }
  
  // Use the existing findTeamByName function which handles nameRegex
  const team = findTeamByName(searchKey);
  if (team) return team;
  
  // Additional fallback for abbreviation and location (not covered by nameRegex)
  return Object.values(Teams).find(t => 
    t.abbreviation.toLowerCase() === key ||
    t.location.toLowerCase() === key
  ) || null;
}

// Get team for a specific guild ID (Method 2: Guild-based)
export const getTeamForGuild = (guildId: string | null): Team => {
  const cacheKey = guildId || 'default';
  
  if (teamCache.has(cacheKey)) {
    return teamCache.get(cacheKey)!;
  }
  
  let team: Team | null = null;

  // Method 1: Try guild-based lookup first using new structure
  if (guildId) {
    const teamAbbr = TeamConfig.getTeamFromServerId(guildId);
    if (teamAbbr) {
      team = findTeamBySearchKey(teamAbbr);
    }
  }
  
  // Method 2: Fall back to search key
  if (!team) {
    team = findTeamBySearchKey(TeamConfig.teamSearchKey);
  }
  
  if (!team) {
    throw new Error(`Team not found for search key '${TeamConfig.teamSearchKey}'. Available teams: ${Object.values(Teams).map(t => `${t.name} (${t.abbreviation})`).join(', ')}`);
  }
  
  teamCache.set(cacheKey, team);
  return team;
};

// Get the configured team based on environment variables (Method 1: Single search key)
export const getCurrentTeam = (): Team => {
  return getTeamForGuild(null);
};

// Legacy export for backward compatibility
export const OSAKA_KAIJU: Team = Teams.OSAKA_KAIJU;

// Current team instance - dynamically determined (defaults to search key method)
export const CURRENT_TEAM = getCurrentTeam();

