import { ResultAsync, okAsync } from 'neverthrow';
import { AppError } from 'typings/errors.typings';

import { TeamConfig } from './config/config';
import { Teams, findTeamByName } from './teams';

export interface TeamInfo {
  id: number;
  name: string;
  abbreviation: string;
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
    };
    return okAsync(teamInfo);
  }

  // Fallback: return a minimal TeamInfo with the key as name
  const fallbackTeam: TeamInfo = {
    id: 0,
    name: teamKey,
    abbreviation: teamKey.toUpperCase(),
  };
  return okAsync(fallbackTeam);
}
