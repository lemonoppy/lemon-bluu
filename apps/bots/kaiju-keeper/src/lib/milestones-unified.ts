import { PortalClient } from 'src/db/PortalClient';
import Query from 'src/lib/db';
import { logger } from 'src/lib/logger';

export interface MilestoneAchievement {
  type: 'player' | 'team';
  scope: 'season' | 'career' | 'team';
  category: string;
  player?: string;
  team?: string;
  milestone: number;
  currentValue: number;
  statName: string;
}

const PLAYER_SEASON_MILESTONE_MARKERS = {
  yards: [100, 250, 500, 750, 1000, 1500, 2000, 2500, 3000, 4000, 5000],
  passingYards: [250, 500, 1000, 1500, 2000, 3000, 4000, 5000, 7500, 10000],
  tds: [5, 10, 15, 20, 25, 30, 40, 50, 75, 100],
  tackles: [20, 50, 75, 100, 150, 200, 250, 300, 400, 500],
  ints: [5, 10, 15, 20, 25, 30, 40, 50],
  pancakes: [15, 25, 50, 75, 100, 150, 200, 250, 300],
  fieldGoals: [5, 10, 15, 20, 25, 30, 40, 50],
  punts: [10, 25, 50, 75, 100, 150, 200]
};

const PLAYER_CAREER_MILESTONE_MARKERS = {
  yards: [500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000, 25000, 30000],
  passingYards: [1000, 2500, 5000, 7500, 10000, 15000, 20000, 25000, 30000, 40000, 50000],
  tds: [10, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500],
  tackles: [100, 250, 500, 750, 1000, 1500, 2000, 2500, 3000, 4000, 5000],
  ints: [10, 25, 50, 75, 100, 150, 200, 250, 300],
  pancakes: [50, 100, 250, 500, 750, 1000, 1500, 2000, 2500, 3000],
  fieldGoals: [10, 25, 50, 75, 100, 150, 200, 250, 300],
  punts: [25, 50, 100, 250, 500, 750, 1000, 1500, 2000]
};

const TEAM_MILESTONE_MARKERS = {
  wins: [25, 50, 75, 100, 150, 200, 250, 300, 400, 500],
  points: [250, 500, 1000, 1500, 2000, 2500, 3000, 4000, 5000],
  tds: [50, 100, 150, 200, 250, 300, 400, 500, 750, 1000],
  tackles: [250, 500, 750, 1000, 1500, 2000, 2500, 3000],
  ints: [25, 50, 75, 100, 150, 200, 250, 300],
  pancakes: [100, 200, 300, 500, 750, 1000, 1500, 2000]
};

export class UnifiedMilestoneChecker {
  private static getRecentlyAchievedMilestones(currentValue: number, previousValue: number, milestones: number[]): number[] {
    return milestones.filter(milestone => 
      currentValue >= milestone && previousValue < milestone
    );
  }

  // Get aggregated stats for a player from unified table including team info
  private static async getPlayerSeasonStats(pid: number, season: number, throughWeek: number): Promise<any> {
    const query = `
      SELECT 
        pid,
        team,
        SUM(passyds) as passyds,
        SUM(passtd) as passtd,
        SUM(rushyds) as rushyds,
        SUM(rushtd) as rushtd,
        SUM(recyds) as recyds,
        SUM(rectd) as rectd,
        SUM(deftck) as deftck,
        SUM(defint) as defint,
        SUM(otherpancakes) as otherpancakes,
        SUM(rushyds + recyds) as totalyds,
        SUM(passtd + rushtd + rectd) as totaltds,
        SUM(kfgmu20 + kfgm2029 + kfgm3039 + kfgm4049 + kfgm50) as kfgtotal,
        SUM(ppunts) as ppunts
      FROM player_stats 
      WHERE pid = $1 AND season = $2 AND week <= $3 AND seasonstate != 'PreSeason'
      GROUP BY pid, team
      ORDER BY team
      LIMIT 1
    `;
    
    const result = await Query(query, [pid.toString(), season.toString(), throughWeek.toString()]);
    
    return result.match(
      (queryResult) => queryResult.rows[0] || null,
      (error) => {
        logger.error('Error getting player season stats:', error);
        return null;
      }
    );
  }

  // Get aggregated career stats for a player from unified table
  private static async getPlayerCareerStats(pid: number): Promise<any> {
    const query = `
      SELECT 
        pid,
        SUM(passyds) as passyds,
        SUM(passtd) as passtd,
        SUM(rushyds) as rushyds,
        SUM(rushtd) as rushtd,
        SUM(recyds) as recyds,
        SUM(rectd) as rectd,
        SUM(deftck) as deftck,
        SUM(defint) as defint,
        SUM(otherpancakes) as otherpancakes,
        SUM(rushyds + recyds) as totalyds,
        SUM(passtd + rushtd + rectd) as totaltds,
        SUM(kfgmu20 + kfgm2029 + kfgm3039 + kfgm4049 + kfgm50) as kfgtotal,
        SUM(ppunts) as ppunts
      FROM player_stats 
      WHERE pid = $1 AND seasonstate != 'PreSeason'
      GROUP BY pid
    `;
    
    const result = await Query(query, [pid.toString()]);
    
    return result.match(
      (queryResult) => queryResult.rows[0] || null,
      (error) => {
        logger.error('Error getting player career stats:', error);
        return null;
      }
    );
  }

  // Get all active players from current week
  private static async getActivePlayersInWeek(season: number, week: number): Promise<number[]> {
    const query = `
      SELECT DISTINCT pid 
      FROM player_stats 
      WHERE season = $1 AND week = $2 AND seasonstate != 'PreSeason'
    `;
    
    const result = await Query(query, [season.toString(), week.toString()]);
    
    return result.match(
      (queryResult) => queryResult.rows.map((row: any) => row.pid),
      (error) => {
        logger.error('Error getting active players:', error);
        return [];
      }
    );
  }

  // Get player name from cached players map
  private static getPlayerNameFromCache(pid: number, playersMap: Map<number, string>): string {
    return playersMap.get(pid) || `Player ${pid}`;
  }

  // OPTIMIZATION: Batch get season stats for multiple players
  private static async getBatchPlayerSeasonStats(playerIds: number[], season: number, throughWeek: number): Promise<Map<number, any>> {
    if (playerIds.length === 0) return new Map();
    
    const query = `
      SELECT 
        pid,
        team,
        SUM(passyds) as passyds,
        SUM(passtd) as passtd,
        SUM(rushyds) as rushyds,
        SUM(rushtd) as rushtd,
        SUM(recyds) as recyds,
        SUM(rectd) as rectd,
        SUM(deftck) as deftck,
        SUM(defint) as defint,
        SUM(otherpancakes) as otherpancakes,
        SUM(rushyds + recyds) as totalyds,
        SUM(passtd + rushtd + rectd) as totaltds,
        SUM(kfgmu20 + kfgm2029 + kfgm3039 + kfgm4049 + kfgm50) as kfgtotal,
        SUM(ppunts) as ppunts
      FROM player_stats 
      WHERE pid = ANY($1) AND season = $2 AND week <= $3 AND seasonstate != 'PreSeason'
      GROUP BY pid, team
    `;
    
    const result = await Query(query, [`{${playerIds.join(',')}}`, season.toString(), throughWeek.toString()]);
    
    return result.match(
      (queryResult) => {
        const statsMap = new Map<number, any>();
        queryResult.rows.forEach((row: any) => {
          statsMap.set(row.pid, row);
        });
        return statsMap;
      },
      (error) => {
        logger.error('Error getting batch player season stats:', error);
        return new Map();
      }
    );
  }

  // OPTIMIZATION: Batch get career stats for multiple players
  private static async getBatchPlayerCareerStats(playerIds: number[]): Promise<Map<number, any>> {
    if (playerIds.length === 0) return new Map();
    
    const query = `
      SELECT 
        pid,
        SUM(passyds) as passyds,
        SUM(passtd) as passtd,
        SUM(rushyds) as rushyds,
        SUM(rushtd) as rushtd,
        SUM(recyds) as recyds,
        SUM(rectd) as rectd,
        SUM(deftck) as deftck,
        SUM(defint) as defint,
        SUM(otherpancakes) as otherpancakes,
        SUM(rushyds + recyds) as totalyds,
        SUM(passtd + rushtd + rectd) as totaltds,
        SUM(kfgmu20 + kfgm2029 + kfgm3039 + kfgm4049 + kfgm50) as kfgtotal,
        SUM(ppunts) as ppunts
      FROM player_stats 
      WHERE pid = ANY($1) AND seasonstate != 'PreSeason'
      GROUP BY pid
    `;
    
    const result = await Query(query, [`{${playerIds.join(',')}}`]);
    
    return result.match(
      (queryResult) => {
        const statsMap = new Map<number, any>();
        queryResult.rows.forEach((row: any) => {
          statsMap.set(row.pid, row);
        });
        return statsMap;
      },
      (error) => {
        logger.error('Error getting batch player career stats:', error);
        return new Map();
      }
    );
  }

  static async checkPlayerMilestones(season: number, week: number): Promise<MilestoneAchievement[]> {
    const achievements: MilestoneAchievement[] = [];
    
    try {
      // OPTIMIZATION 1: Get all data in parallel at the start
      const [activePlayerIds, allPlayers] = await Promise.all([
        this.getActivePlayersInWeek(season, week),
        PortalClient.getAllPlayers()
      ]);
      
      // OPTIMIZATION 2: Create a player name lookup map once
      const playersMap = new Map<number, string>();
      allPlayers.forEach(player => {
        if (player.pid && player.firstName && player.lastName) {
          playersMap.set(player.pid, `${player.firstName} ${player.lastName}`);
        }
      });
      
      // OPTIMIZATION 3: Batch database queries for all players
      const allCurrentStats = await this.getBatchPlayerSeasonStats(activePlayerIds, season, week);
      const allPreviousStats = await this.getBatchPlayerSeasonStats(activePlayerIds, season, week - 1);
      const allCareerStats = await this.getBatchPlayerCareerStats(activePlayerIds);
      
      // OPTIMIZATION 4: Process players without individual database calls
      for (const pid of activePlayerIds) {
        const currentStats = allCurrentStats.get(pid);
        const previousStats = allPreviousStats.get(pid);
        const careerStats = allCareerStats.get(pid);
        
        if (!currentStats) continue;
        
        const playerName = this.getPlayerNameFromCache(pid, playersMap);
        
        // Check season milestones
        const seasonChecks = [
          { stat: 'passyds', category: 'Passing', statName: 'passing yards', markers: PLAYER_SEASON_MILESTONE_MARKERS.passingYards },
          { stat: 'rushyds', category: 'Rushing', statName: 'rushing yards', markers: PLAYER_SEASON_MILESTONE_MARKERS.yards },
          { stat: 'recyds', category: 'Receiving', statName: 'receiving yards', markers: PLAYER_SEASON_MILESTONE_MARKERS.yards },
          { stat: 'totalyds', category: 'All-Purpose', statName: 'total yards', markers: PLAYER_SEASON_MILESTONE_MARKERS.yards },
          { stat: 'passtd', category: 'Passing', statName: 'passing TDs', markers: PLAYER_SEASON_MILESTONE_MARKERS.tds },
          { stat: 'rushtd', category: 'Rushing', statName: 'rushing TDs', markers: PLAYER_SEASON_MILESTONE_MARKERS.tds },
          { stat: 'rectd', category: 'Receiving', statName: 'receiving TDs', markers: PLAYER_SEASON_MILESTONE_MARKERS.tds },
          { stat: 'totaltds', category: 'All-Purpose', statName: 'total TDs', markers: PLAYER_SEASON_MILESTONE_MARKERS.tds },
          { stat: 'deftck', category: 'Defense', statName: 'tackles', markers: PLAYER_SEASON_MILESTONE_MARKERS.tackles },
          { stat: 'defint', category: 'Defense', statName: 'interceptions', markers: PLAYER_SEASON_MILESTONE_MARKERS.ints },
          { stat: 'otherpancakes', category: 'Blocking', statName: 'pancakes', markers: PLAYER_SEASON_MILESTONE_MARKERS.pancakes },
          { stat: 'kfgtotal', category: 'Kicking', statName: 'field goals', markers: PLAYER_SEASON_MILESTONE_MARKERS.fieldGoals },
          { stat: 'ppunts', category: 'Punting', statName: 'punts', markers: PLAYER_SEASON_MILESTONE_MARKERS.punts }
        ];

        for (const check of seasonChecks) {
          const currentValue = currentStats[check.stat] || 0;
          const previousValue = previousStats?.[check.stat] || 0;
          
          if (currentValue > 0) {
            const recentMilestones = this.getRecentlyAchievedMilestones(
              currentValue, previousValue, check.markers
            );
            
            for (const milestone of recentMilestones) {
              achievements.push({
                type: 'player',
                scope: 'season',
                category: check.category,
                player: playerName,
                team: currentStats.team,
                milestone,
                currentValue,
                statName: check.statName
              });
            }
          }
        }

        // Check career milestones
        if (careerStats) {
          const careerChecks = [
            { stat: 'passyds', category: 'Passing', statName: 'career passing yards', markers: PLAYER_CAREER_MILESTONE_MARKERS.passingYards },
            { stat: 'rushyds', category: 'Rushing', statName: 'career rushing yards', markers: PLAYER_CAREER_MILESTONE_MARKERS.yards },
            { stat: 'recyds', category: 'Receiving', statName: 'career receiving yards', markers: PLAYER_CAREER_MILESTONE_MARKERS.yards },
            { stat: 'totalyds', category: 'All-Purpose', statName: 'career total yards', markers: PLAYER_CAREER_MILESTONE_MARKERS.yards },
            { stat: 'passtd', category: 'Passing', statName: 'career passing TDs', markers: PLAYER_CAREER_MILESTONE_MARKERS.tds },
            { stat: 'rushtd', category: 'Rushing', statName: 'career rushing TDs', markers: PLAYER_CAREER_MILESTONE_MARKERS.tds },
            { stat: 'rectd', category: 'Receiving', statName: 'career receiving TDs', markers: PLAYER_CAREER_MILESTONE_MARKERS.tds },
            { stat: 'totaltds', category: 'All-Purpose', statName: 'career total TDs', markers: PLAYER_CAREER_MILESTONE_MARKERS.tds },
            { stat: 'deftck', category: 'Defense', statName: 'career tackles', markers: PLAYER_CAREER_MILESTONE_MARKERS.tackles },
            { stat: 'defint', category: 'Defense', statName: 'career interceptions', markers: PLAYER_CAREER_MILESTONE_MARKERS.ints },
            { stat: 'otherpancakes', category: 'Blocking', statName: 'career pancakes', markers: PLAYER_CAREER_MILESTONE_MARKERS.pancakes },
            { stat: 'kfgtotal', category: 'Kicking', statName: 'career field goals', markers: PLAYER_CAREER_MILESTONE_MARKERS.fieldGoals },
            { stat: 'ppunts', category: 'Punting', statName: 'career punts', markers: PLAYER_CAREER_MILESTONE_MARKERS.punts }
          ];

          for (const check of careerChecks) {
            const currentCareerValue = careerStats[check.stat] || 0;
            
            // FIXED: Calculate previous career value correctly
            // previousStats is season total through previous week, currentStats is through current week
            // So previous career = current career - (current season through current week - current season through previous week)
            const currentSeasonTotal = currentStats[check.stat] || 0;
            const previousSeasonTotal = previousStats?.[check.stat] || 0;
            const thisWeekContribution = currentSeasonTotal - previousSeasonTotal;
            const previousCareerValue = Math.max(0, currentCareerValue - thisWeekContribution);
            
            if (currentCareerValue > 0) {
              const recentMilestones = this.getRecentlyAchievedMilestones(
                currentCareerValue, previousCareerValue, check.markers
              );
              
              for (const milestone of recentMilestones) {
                achievements.push({
                  type: 'player',
                  scope: 'career',
                  category: check.category,
                  player: playerName,
                  team: currentStats.team,
                  milestone,
                  currentValue: currentCareerValue,
                  statName: check.statName
                });
              }
            }
          }
        }
      }
      
    } catch (error) {
      logger.error('Error checking player milestones:', error);
    }
    
    return achievements;
  }

  static async checkTeamMilestones(season: number, week: number): Promise<MilestoneAchievement[]> {
    const achievements: MilestoneAchievement[] = [];
    
    try {
      // Get team stats aggregated from player stats
      const query = `
        SELECT 
          team,
          SUM(passtd + rushtd + rectd) as totaltds,
          SUM(deftck) as totaltackles,
          SUM(defint) as totalints,
          SUM(otherpancakes) as totalpancakes
        FROM player_stats 
        WHERE season = $1 AND week <= $2 AND seasonstate != 'PreSeason'
        GROUP BY team
      `;
      
      const result = await Query(query, [season.toString(), week.toString()]);
      
      result.match(
        async (queryResult) => {
          for (const teamRow of queryResult.rows) {
            const { team } = teamRow;
            
            // Get previous week totals for comparison
            const previousQuery = `
              SELECT 
                team,
                SUM(passtd + rushtd + rectd) as totaltds,
                SUM(deftck) as totaltackles,
                SUM(defint) as totalints,
                SUM(otherpancakes) as totalpancakes
              FROM player_stats 
              WHERE season = $1 AND week < $2 AND seasonstate != 'PreSeason' AND team = $3
              GROUP BY team
            `;
            
            const previousResult = await Query(previousQuery, [season.toString(), week.toString(), team]);
            
            previousResult.match(
              (prevQueryResult) => {
                const previousTeamStats = prevQueryResult.rows[0] || {};
                
                const teamChecks = [
                  { stat: 'totaltds', category: 'Team Offense', statName: 'team touchdowns', markers: TEAM_MILESTONE_MARKERS.tds },
                  { stat: 'totaltackles', category: 'Team Defense', statName: 'team tackles', markers: TEAM_MILESTONE_MARKERS.tackles },
                  { stat: 'totalints', category: 'Team Defense', statName: 'team interceptions', markers: TEAM_MILESTONE_MARKERS.ints },
                  { stat: 'totalpancakes', category: 'Team Offense', statName: 'team pancakes', markers: TEAM_MILESTONE_MARKERS.pancakes }
                ];

                for (const check of teamChecks) {
                  const currentValue = teamRow[check.stat] || 0;
                  const previousValue = previousTeamStats[check.stat] || 0;
                  
                  if (currentValue > 0) {
                    const recentMilestones = this.getRecentlyAchievedMilestones(
                      currentValue, previousValue, check.markers
                    );
                    
                    for (const milestone of recentMilestones) {
                      achievements.push({
                        type: 'team',
                        scope: 'team',
                        category: check.category,
                        player: team,
                        team: team,
                        milestone,
                        currentValue,
                        statName: check.statName
                      });
                    }
                  }
                }
              },
              (error) => {
                logger.error('Error getting previous team stats:', error);
              }
            );
          }
        },
        (error) => {
          logger.error('Error getting team stats:', error);
        }
      );
      
    } catch (error) {
      logger.error('Error checking team milestones:', error);
    }
    
    return achievements;
  }

  static async checkAllMilestones(season: number, week: number): Promise<MilestoneAchievement[]> {
    const [playerMilestones, teamMilestones] = await Promise.all([
      this.checkPlayerMilestones(season, week),
      this.checkTeamMilestones(season, week)
    ]);
    
    return [...playerMilestones, ...teamMilestones];
  }

  // Helper function to determine stat category for sorting
  private static getStatCategory(achievement: MilestoneAchievement): number {
    const statName = achievement.statName.toLowerCase();
    
    // QB stats (Passing)
    if (statName.includes('passing')) return 1;
    
    // RB stats (Rushing) 
    if (statName.includes('rushing')) return 2;
    
    // WR stats (Receiving)
    if (statName.includes('receiving')) return 3;
    
    // Defense stats
    if (statName.includes('tackle') || statName.includes('sack') || statName.includes('interception') || 
        statName.includes('deflection') || statName.includes('safety') || statName.includes('fumble')) return 4;
    
    // Kicker stats
    if (statName.includes('field goal') || statName.includes('punt')) return 5;
    
    // OL stats (Blocking/Pancakes)
    if (statName.includes('pancake') || statName.includes('block')) return 6;
    
    // All-Purpose and other stats
    return 7;
  }

  // Sort milestones by category and then by milestone value (descending)
  private static sortMilestones(milestones: MilestoneAchievement[]): MilestoneAchievement[] {
    return milestones.sort((a, b) => {
      const categoryA = this.getStatCategory(a);
      const categoryB = this.getStatCategory(b);
      
      // First sort by category
      if (categoryA !== categoryB) {
        return categoryA - categoryB;
      }
      
      // Then sort by milestone value (descending)
      return b.milestone - a.milestone;
    });
  }

  static async formatMilestoneMessage(achievements: MilestoneAchievement[]): Promise<string> {
    if (achievements.length === 0) {
      return '';
    }

    // Separate season and career milestones
    const seasonMilestones = this.sortMilestones(achievements.filter(a => a.scope === 'season'));
    const careerMilestones = this.sortMilestones(achievements.filter(a => a.scope === 'career'));
    const teamMilestones = achievements.filter(a => a.type === 'team');

    const messageParts: string[] = [];

    if (seasonMilestones.length > 0) {
      messageParts.push('🏃 **Season Milestones:**');
      seasonMilestones.forEach(achievement => {
        messageParts.push(
          `• **${achievement.player}** reached **${achievement.milestone.toLocaleString()} ${achievement.statName}** (${achievement.currentValue.toLocaleString()} this season)`
        );
      });
    }

    if (careerMilestones.length > 0) {
      if (messageParts.length > 0) messageParts.push('');
      messageParts.push('⭐ **Career Milestones:**');
      careerMilestones.forEach(achievement => {
        messageParts.push(
          `• **${achievement.player}** reached **${achievement.milestone.toLocaleString()} ${achievement.statName}** (${achievement.currentValue.toLocaleString()} career total)`
        );
      });
    }

    if (teamMilestones.length > 0) {
      if (messageParts.length > 0) messageParts.push('');
      messageParts.push('🏈 **Team Milestones:**');
      teamMilestones.forEach(achievement => {
        messageParts.push(
          `• **${achievement.player}** reached **${achievement.milestone.toLocaleString()} ${achievement.statName}** (${achievement.currentValue.toLocaleString()} total)`
        );
      });
    }

    return messageParts.join('\n');
  }
}