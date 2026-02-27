import { DatabaseClient } from 'src/db/DBClient';
import { logger } from 'src/lib/logger';
import { sumStatsByKeys } from 'src/lib/sumStats';
import { resolveTeam } from 'src/lib/teamResolver';

export interface MilestoneAchievement {
  type: 'player' | 'team';
  scope: 'season' | 'career' | 'team';
  category: string;
  player?: string;
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
  pancakes: [15, 25, 50, 75, 100, 150, 200, 250, 300]
};

const PLAYER_CAREER_MILESTONE_MARKERS = {
  yards: [500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000, 25000, 30000],
  passingYards: [1000, 2500, 5000, 7500, 10000, 15000, 20000, 25000, 30000, 40000, 50000],
  tds: [10, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500],
  tackles: [100, 250, 500, 750, 1000, 1500, 2000, 2500, 3000, 4000, 5000],
  ints: [10, 25, 50, 75, 100, 150, 200, 250, 300],
  pancakes: [50, 100, 250, 500, 750, 1000, 1500, 2000, 2500, 3000]
};

const TEAM_MILESTONE_MARKERS = {
  wins: [25, 50, 75, 100, 150, 200, 250, 300, 400, 500],
  points: [250, 500, 1000, 1500, 2000, 2500, 3000, 4000, 5000],
  tds: [50, 100, 150, 200, 250, 300, 400, 500, 750, 1000],
  tackles: [250, 500, 750, 1000, 1500, 2000, 2500, 3000],
  ints: [25, 50, 75, 100, 150, 200, 250, 300],
  pancakes: [100, 200, 300, 500, 750, 1000, 1500, 2000]
};

export class MilestoneChecker {
  private static getRecentlyAchievedMilestones(currentValue: number, previousValue: number, milestones: number[]): number[] {
    return milestones.filter(milestone => 
      currentValue >= milestone && previousValue < milestone
    );
  }

  static async checkPlayerMilestones(season: number, week: number, guildId?: string): Promise<MilestoneAchievement[]> {
    const achievements: MilestoneAchievement[] = [];
    
    try {
      // Get current season totals
      const passingRecords = await DatabaseClient.getPassingStats(true, guildId);
      const rushingRecords = await DatabaseClient.getRushingStats(true, guildId);
      const receivingRecords = await DatabaseClient.getReceivingStats(true, guildId);
      const defensiveRecords = await DatabaseClient.getDefensiveStats(true, guildId);
      const otherRecords = await DatabaseClient.getOtherStats(true, guildId);

      if (!Array.isArray(passingRecords) || !Array.isArray(rushingRecords) || 
          !Array.isArray(receivingRecords) || !Array.isArray(defensiveRecords) || 
          !Array.isArray(otherRecords)) {
        logger.warn('Some stat records are not available for milestone checking');
        return achievements;
      }

      // Sum current season stats (through this week)
      const currentPassingStats = Object.values(sumStatsByKeys(
        passingRecords.filter(r => r.season === season && r.week <= week), 
        ['pid'], ['id', 'season', 'week']
      )).filter(record => record.onteam);

      const currentRushingStats = Object.values(sumStatsByKeys(
        rushingRecords.filter(r => r.season === season && r.week <= week), 
        ['pid'], ['id', 'season', 'week']
      )).filter(record => record.onteam);

      const currentReceivingStats = Object.values(sumStatsByKeys(
        receivingRecords.filter(r => r.season === season && r.week <= week), 
        ['pid'], ['id', 'season', 'week']
      )).filter(record => record.onteam);

      const currentDefensiveStats = Object.values(sumStatsByKeys(
        defensiveRecords.filter(r => r.season === season && r.week <= week), 
        ['pid'], ['id', 'season', 'week']
      )).filter(record => record.onteam);

      const currentOtherStats = Object.values(sumStatsByKeys(
        otherRecords.filter(r => r.season === season && r.week <= week), 
        ['pid'], ['id', 'season', 'week']
      )).filter(record => record.onteam);

      // Sum previous week stats (through week - 1)
      const previousPassingStats = Object.values(sumStatsByKeys(
        passingRecords.filter(r => r.season === season && r.week < week), 
        ['pid'], ['id', 'season', 'week']
      )).filter(record => record.onteam);

      const previousRushingStats = Object.values(sumStatsByKeys(
        rushingRecords.filter(r => r.season === season && r.week < week), 
        ['pid'], ['id', 'season', 'week']
      )).filter(record => record.onteam);

      const previousReceivingStats = Object.values(sumStatsByKeys(
        receivingRecords.filter(r => r.season === season && r.week < week), 
        ['pid'], ['id', 'season', 'week']
      )).filter(record => record.onteam);

      const previousDefensiveStats = Object.values(sumStatsByKeys(
        defensiveRecords.filter(r => r.season === season && r.week < week), 
        ['pid'], ['id', 'season', 'week']
      )).filter(record => record.onteam);

      const previousOtherStats = Object.values(sumStatsByKeys(
        otherRecords.filter(r => r.season === season && r.week < week), 
        ['pid'], ['id', 'season', 'week']
      )).filter(record => record.onteam);

      // Check for milestone achievements
      const checkPlayerStat = (
        currentStats: any[], 
        previousStats: any[], 
        statKey: string, 
        category: string,
        milestoneKey: keyof typeof PLAYER_SEASON_MILESTONE_MARKERS
      ) => {
        currentStats.forEach(currentPlayer => {
          const previousPlayer = previousStats.find(p => p.pid === currentPlayer.pid);
          const currentValue = Number(currentPlayer[statKey]) || 0;
          const previousValue = previousPlayer ? (Number(previousPlayer[statKey]) || 0) : 0;
          
          const achievedMilestones = this.getRecentlyAchievedMilestones(
            currentValue, 
            previousValue, 
            PLAYER_SEASON_MILESTONE_MARKERS[milestoneKey]
          );

          achievedMilestones.forEach(milestone => {
            achievements.push({
              type: 'player',
              scope: 'season',
              category,
              player: `${currentPlayer.firstname} ${currentPlayer.lastname}`,
              milestone,
              currentValue,
              statName: category
            });
          });
        });
      };

      // Check all player stat categories
      checkPlayerStat(currentPassingStats, previousPassingStats, 'td', 'Passing TDs', 'tds');
      checkPlayerStat(currentPassingStats, previousPassingStats, 'yards', 'Passing Yards', 'passingYards');
      checkPlayerStat(currentRushingStats, previousRushingStats, 'td', 'Rushing TDs', 'tds');
      checkPlayerStat(currentRushingStats, previousRushingStats, 'yards', 'Rushing Yards', 'yards');
      checkPlayerStat(currentReceivingStats, previousReceivingStats, 'td', 'Receiving TDs', 'tds');
      checkPlayerStat(currentReceivingStats, previousReceivingStats, 'yards', 'Receiving Yards', 'yards');
      checkPlayerStat(currentDefensiveStats, previousDefensiveStats, 'tck', 'Tackles', 'tackles');
      checkPlayerStat(currentDefensiveStats, previousDefensiveStats, 'sack', 'Sacks', 'ints');
      checkPlayerStat(currentDefensiveStats, previousDefensiveStats, 'int', 'Interceptions', 'ints');
      checkPlayerStat(currentDefensiveStats, previousDefensiveStats, 'pd', 'Pass Deflections', 'ints');
      checkPlayerStat(currentOtherStats, previousOtherStats, 'pancakes', 'Pancakes', 'pancakes');

    } catch (error) {
      logger.error('Error checking player milestones:', error);
    }

    return achievements;
  }

  static async checkPlayerCareerMilestones(season: number, week: number, guildId?: string): Promise<MilestoneAchievement[]> {
    const achievements: MilestoneAchievement[] = [];
    
    try {
      // Get all-time career stats
      const passingRecords = await DatabaseClient.getPassingStats(true, guildId);
      const rushingRecords = await DatabaseClient.getRushingStats(true, guildId);
      const receivingRecords = await DatabaseClient.getReceivingStats(true, guildId);
      const defensiveRecords = await DatabaseClient.getDefensiveStats(true, guildId);
      const otherRecords = await DatabaseClient.getOtherStats(true, guildId);

      if (!Array.isArray(passingRecords) || !Array.isArray(rushingRecords) || 
          !Array.isArray(receivingRecords) || !Array.isArray(defensiveRecords) || 
          !Array.isArray(otherRecords)) {
        logger.warn('Some stat records are not available for career milestone checking');
        return achievements;
      }

      // Sum current career totals (through this week)
      const currentCareerPassingStats = Object.values(sumStatsByKeys(
        passingRecords.filter(r => 
          r.season < season || (r.season === season && r.week <= week)
        ), 
        ['pid'], ['id', 'season', 'week']
      )).filter(record => record.onteam);

      const currentCareerRushingStats = Object.values(sumStatsByKeys(
        rushingRecords.filter(r => 
          r.season < season || (r.season === season && r.week <= week)
        ), 
        ['pid'], ['id', 'season', 'week']
      )).filter(record => record.onteam);

      const currentCareerReceivingStats = Object.values(sumStatsByKeys(
        receivingRecords.filter(r => 
          r.season < season || (r.season === season && r.week <= week)
        ), 
        ['pid'], ['id', 'season', 'week']
      )).filter(record => record.onteam);

      const currentCareerDefensiveStats = Object.values(sumStatsByKeys(
        defensiveRecords.filter(r => 
          r.season < season || (r.season === season && r.week <= week)
        ), 
        ['pid'], ['id', 'season', 'week']
      )).filter(record => record.onteam);

      const currentCareerOtherStats = Object.values(sumStatsByKeys(
        otherRecords.filter(r => 
          r.season < season || (r.season === season && r.week <= week)
        ), 
        ['pid'], ['id', 'season', 'week']
      )).filter(record => record.onteam);

      // Sum previous career totals (through previous week)
      const previousCareerPassingStats = Object.values(sumStatsByKeys(
        passingRecords.filter(r => 
          r.season < season || (r.season === season && r.week < week)
        ), 
        ['pid'], ['id', 'season', 'week']
      )).filter(record => record.onteam);

      const previousCareerRushingStats = Object.values(sumStatsByKeys(
        rushingRecords.filter(r => 
          r.season < season || (r.season === season && r.week < week)
        ), 
        ['pid'], ['id', 'season', 'week']
      )).filter(record => record.onteam);

      const previousCareerReceivingStats = Object.values(sumStatsByKeys(
        receivingRecords.filter(r => 
          r.season < season || (r.season === season && r.week < week)
        ), 
        ['pid'], ['id', 'season', 'week']
      )).filter(record => record.onteam);

      const previousCareerDefensiveStats = Object.values(sumStatsByKeys(
        defensiveRecords.filter(r => 
          r.season < season || (r.season === season && r.week < week)
        ), 
        ['pid'], ['id', 'season', 'week']
      )).filter(record => record.onteam);

      const previousCareerOtherStats = Object.values(sumStatsByKeys(
        otherRecords.filter(r => 
          r.season < season || (r.season === season && r.week < week)
        ), 
        ['pid'], ['id', 'season', 'week']
      )).filter(record => record.onteam);

      // Check for career milestone achievements
      const checkPlayerCareerStat = (
        currentStats: any[], 
        previousStats: any[], 
        statKey: string, 
        category: string,
        milestoneKey: keyof typeof PLAYER_CAREER_MILESTONE_MARKERS
      ) => {
        currentStats.forEach(currentPlayer => {
          const previousPlayer = previousStats.find(p => p.pid === currentPlayer.pid);
          const currentValue = Number(currentPlayer[statKey]) || 0;
          const previousValue = previousPlayer ? (Number(previousPlayer[statKey]) || 0) : 0;
          
          const achievedMilestones = this.getRecentlyAchievedMilestones(
            currentValue, 
            previousValue, 
            PLAYER_CAREER_MILESTONE_MARKERS[milestoneKey]
          );

          achievedMilestones.forEach(milestone => {
            achievements.push({
              type: 'player',
              scope: 'career',
              category,
              player: `${currentPlayer.firstname} ${currentPlayer.lastname}`,
              milestone,
              currentValue,
              statName: category
            });
          });
        });
      };

      // Check all player career stat categories
      checkPlayerCareerStat(currentCareerPassingStats, previousCareerPassingStats, 'td', 'Career Passing TDs', 'tds');
      checkPlayerCareerStat(currentCareerPassingStats, previousCareerPassingStats, 'yards', 'Career Passing Yards', 'passingYards');
      checkPlayerCareerStat(currentCareerRushingStats, previousCareerRushingStats, 'td', 'Career Rushing TDs', 'tds');
      checkPlayerCareerStat(currentCareerRushingStats, previousCareerRushingStats, 'yards', 'Career Rushing Yards', 'yards');
      checkPlayerCareerStat(currentCareerReceivingStats, previousCareerReceivingStats, 'td', 'Career Receiving TDs', 'tds');
      checkPlayerCareerStat(currentCareerReceivingStats, previousCareerReceivingStats, 'yards', 'Career Receiving Yards', 'yards');
      checkPlayerCareerStat(currentCareerDefensiveStats, previousCareerDefensiveStats, 'tck', 'Career Tackles', 'tackles');
      checkPlayerCareerStat(currentCareerDefensiveStats, previousCareerDefensiveStats, 'sack', 'Career Sacks', 'ints');
      checkPlayerCareerStat(currentCareerDefensiveStats, previousCareerDefensiveStats, 'int', 'Career Interceptions', 'ints');
      checkPlayerCareerStat(currentCareerDefensiveStats, previousCareerDefensiveStats, 'pd', 'Career Pass Deflections', 'ints');
      checkPlayerCareerStat(currentCareerOtherStats, previousCareerOtherStats, 'pancakes', 'Career Pancakes', 'pancakes');

    } catch (error) {
      logger.error('Error checking player career milestones:', error);
    }

    return achievements;
  }

  static async checkTeamMilestones(season: number, week: number, guildId?: string): Promise<MilestoneAchievement[]> {
    const achievements: MilestoneAchievement[] = [];
    
    try {
      // Get all franchise stats (all-time)
      const gameRecords = await DatabaseClient.getGameStats(true, guildId);
      const rushingRecords = await DatabaseClient.getRushingStats(true, guildId);
      const receivingRecords = await DatabaseClient.getReceivingStats(true, guildId);
      const defensiveRecords = await DatabaseClient.getDefensiveStats(true, guildId);
      const otherRecords = await DatabaseClient.getOtherStats(true, guildId);

      if (!Array.isArray(gameRecords) || !Array.isArray(rushingRecords) || 
          !Array.isArray(receivingRecords) || !Array.isArray(defensiveRecords) || 
          !Array.isArray(otherRecords)) {
        logger.warn('Some records are not available for team milestone checking');
        return achievements;
      }

      // Calculate current totals (through this week)
      const currentGameRecords = gameRecords.filter(r => 
        r.season < season || (r.season === season && r.week <= week)
      );
      const currentRushingRecords = rushingRecords.filter(r => 
        r.season < season || (r.season === season && r.week <= week)
      );
      const currentReceivingRecords = receivingRecords.filter(r => 
        r.season < season || (r.season === season && r.week <= week)
      );
      const currentDefensiveRecords = defensiveRecords.filter(r => 
        r.season < season || (r.season === season && r.week <= week)
      );
      const currentOtherRecords = otherRecords.filter(r => 
        r.season < season || (r.season === season && r.week <= week)
      );

      // Calculate previous totals (through previous week)
      const previousGameRecords = gameRecords.filter(r => 
        r.season < season || (r.season === season && r.week < week)
      );
      const previousRushingRecords = rushingRecords.filter(r => 
        r.season < season || (r.season === season && r.week < week)
      );
      const previousReceivingRecords = receivingRecords.filter(r => 
        r.season < season || (r.season === season && r.week < week)
      );
      const previousDefensiveRecords = defensiveRecords.filter(r => 
        r.season < season || (r.season === season && r.week < week)
      );
      const previousOtherRecords = otherRecords.filter(r => 
        r.season < season || (r.season === season && r.week < week)
      );

      // Check franchise milestones
      const checkTeamStat = (
        currentRecords: any[], 
        previousRecords: any[], 
        reducer: (acc: number, record: any) => number, 
        category: string,
        milestoneKey: keyof typeof TEAM_MILESTONE_MARKERS
      ) => {
        const currentValue = currentRecords.reduce(reducer, 0);
        const previousValue = previousRecords.reduce(reducer, 0);
        
        const achievedMilestones = this.getRecentlyAchievedMilestones(
          currentValue, 
          previousValue, 
          TEAM_MILESTONE_MARKERS[milestoneKey]
        );

        achievedMilestones.forEach(milestone => {
          achievements.push({
            type: 'team',
            scope: 'team',
            category,
            milestone,
            currentValue,
            statName: category
          });
        });
      };

      // Check all team stats
      checkTeamStat(
        currentGameRecords, 
        previousGameRecords, 
        (acc, record) => acc + (record.win ? 1 : 0), 
        'Franchise Wins', 
        'wins'
      );
      
      checkTeamStat(
        currentGameRecords, 
        previousGameRecords, 
        (acc, record) => acc + (Number(record.score) || 0), 
        'Franchise Points', 
        'points'
      );
      
      checkTeamStat(
        currentRushingRecords, 
        previousRushingRecords, 
        (acc, record) => acc + (Number(record.td) || 0), 
        'Franchise Rushing TDs', 
        'tds'
      );
      
      checkTeamStat(
        currentReceivingRecords, 
        previousReceivingRecords, 
        (acc, record) => acc + (Number(record.td) || 0), 
        'Franchise Receiving TDs', 
        'tds'
      );
      
      checkTeamStat(
        currentDefensiveRecords, 
        previousDefensiveRecords, 
        (acc, record) => acc + (Number(record.tck) || 0), 
        'Franchise Tackles', 
        'tackles'
      );
      
      checkTeamStat(
        currentDefensiveRecords, 
        previousDefensiveRecords, 
        (acc, record) => acc + (Number(record.int) || 0), 
        'Franchise Interceptions', 
        'ints'
      );
      
      checkTeamStat(
        currentOtherRecords, 
        previousOtherRecords, 
        (acc, record) => acc + (Number(record.pancakes) || 0), 
        'Franchise Pancakes', 
        'pancakes'
      );

    } catch (error) {
      logger.error('Error checking team milestones:', error);
    }

    return achievements;
  }

  static async checkAllMilestones(season: number, week: number, guildId?: string): Promise<MilestoneAchievement[]> {
    const [playerSeasonMilestones, playerCareerMilestones, teamMilestones] = await Promise.all([
      this.checkPlayerMilestones(season, week, guildId),
      this.checkPlayerCareerMilestones(season, week, guildId),
      this.checkTeamMilestones(season, week, guildId)
    ]);

    return [...playerSeasonMilestones, ...playerCareerMilestones, ...teamMilestones];
  }

  static async formatMilestoneMessage(achievements: MilestoneAchievement[], guildId?: string): Promise<string> {
    if (achievements.length === 0) {
      return '🎯 No new milestones achieved this week.';
    }

    const playerSeasonAchievements = achievements.filter(a => a.type === 'player' && a.scope === 'season');
    const playerCareerAchievements = achievements.filter(a => a.type === 'player' && a.scope === 'career');
    const teamAchievements = achievements.filter(a => a.type === 'team');

    let message = '🎉 **NEW MILESTONES ACHIEVED!** 🎉\n\n';

    if (playerSeasonAchievements.length > 0) {
      message += '🏃 **Player Season Milestones:**\n';
      playerSeasonAchievements.forEach(achievement => {
        message += `• **${achievement.player}** reached **${achievement.milestone} ${achievement.category}** (${achievement.currentValue} this season)\n`;
      });
      message += '\n';
    }

    if (playerCareerAchievements.length > 0) {
      message += '⭐ **Player Career Milestones:**\n';
      playerCareerAchievements.forEach(achievement => {
        message += `• **${achievement.player}** reached **${achievement.milestone} ${achievement.category}** (${achievement.currentValue} career total)\n`;
      });
      message += '\n';
    }

    if (teamAchievements.length > 0) {
      message += '🏈 **Team Milestones:**\n';
      
      const teamResult = await resolveTeam(guildId);
      let teamName = 'Team';
      
      teamResult.match(
        (team) => { teamName = team.name; },
        (error) => { 
          logger.warn('Failed to resolve team name for milestones:', error);
          teamName = 'Team';
        }
      );
      
      teamAchievements.forEach(achievement => {
        message += `• **${teamName}** reached **${achievement.milestone} ${achievement.category}** (${achievement.currentValue} total)\n`;
      });
    }

    return message;
  }
}

export default MilestoneChecker;