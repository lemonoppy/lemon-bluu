import { ResultAsync, okAsync } from 'neverthrow';
import { AppError } from 'typings/errors.typings';

import { TeamConfig } from './config/config';
import { Teams, findTeamByName } from './teams';

export interface TeamInfo {
  id: number;
  name: string;
  abbreviation: string;
  dbPrefix: string;
}

/**
 * Resolves team information based on guild ID or fallback to configured team
 */
export function resolveTeam(guildId?: string): ResultAsync<TeamInfo, AppError> {
  // Check if guild ID maps to a team in the new structure
  const teamAbbr = TeamConfig.getTeamFromServerId(guildId || '');
  const teamKey = teamAbbr || TeamConfig.teamSearchKey;

  return getTeamByKey(teamKey);
}

/**
 * Gets team information by team key (name, abbreviation, or ID)
 */
export function getTeamByKey(teamKey: string): ResultAsync<TeamInfo, AppError> {
  // First, try exact abbreviation match (highest priority)
  const teamByAbbr = Object.values(Teams).find(t => 
    t.abbreviation.toLowerCase() === teamKey.toLowerCase()
  );
  
  if (teamByAbbr) {
    const teamInfo: TeamInfo = {
      id: teamByAbbr.id,
      name: `${teamByAbbr.location} ${teamByAbbr.name}`,
      abbreviation: teamByAbbr.abbreviation,
      dbPrefix: teamKey.toLowerCase() // Use the search key as prefix for abbreviation matches
    };
    return okAsync(teamInfo);
  }

  // Then try by team name/location using regex
  const team = findTeamByName(teamKey);
  
  if (team) {
    const teamInfo: TeamInfo = {
      id: team.id,
      name: `${team.location} ${team.name}`,
      abbreviation: team.abbreviation,
      dbPrefix: team.location.toLowerCase().replace(/[^a-z0-9]/g, '') // Use location for name matches
    };
    return okAsync(teamInfo);
  }

  // Try to find by ID
  const teamById = Object.values(Teams).find(t => t.id.toString() === teamKey);
  
  if (teamById) {
    const teamInfo: TeamInfo = {
      id: teamById.id,
      name: `${teamById.location} ${teamById.name}`,
      abbreviation: teamById.abbreviation,
      dbPrefix: teamById.location.toLowerCase().replace(/[^a-z0-9]/g, '') // Use location for ID matches
    };
    return okAsync(teamInfo);
  }

  // Fallback to configured prefix if team not found
  const fallbackTeam: TeamInfo = {
    id: 0,
    name: teamKey,
    abbreviation: teamKey.toUpperCase(),
    dbPrefix: TeamConfig.fallbackDbPrefix
  };
  return okAsync(fallbackTeam);
}

/**
 * Gets the database table prefix for a team
 */
export function getTeamPrefix(guildId?: string): ResultAsync<string, AppError> {
  return resolveTeam(guildId).map(team => team.dbPrefix);
}
