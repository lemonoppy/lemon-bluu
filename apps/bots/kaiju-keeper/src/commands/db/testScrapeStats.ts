import { SlashCommandBuilder } from 'discord.js';
import { PortalClient } from 'src/db/PortalClient';
import { TeamConfig, UserRole } from 'src/lib/config/config';
import {
  fetchAllSeasonGameData,
  validateGameDataStructure
} from 'src/lib/dataPipelineDataFetcher';
import { getSeasonGameData } from 'src/lib/dataPipelineUtils';
import { logger } from 'src/lib/logger';
import { UnifiedMilestoneChecker } from 'src/lib/milestones-unified';
import { MilestoneAchievement } from 'src/lib/milestones-unified';
import { SlashCommand } from 'typings/command';

// Test function that processes data without saving to database  
const testProcessWeekUnified = async (season: number, week: number, progressCallback?: (message: string) => void): Promise<{
  success: boolean;
  totalRecords: number;
  sampleData: any;
  errors: string[];
  message: string;
}> => {
  try {
    progressCallback?.('🔍 Fetching game schedule data...');
    // Get game IDs and week mappings for the season
    const gameData = await getSeasonGameData(season, true);
    
    if (gameData.length === 0) {
      return {
        success: false,
        totalRecords: 0,
        sampleData: null,
        errors: [`No game data found for season ${season}`],
        message: `No game data found for season ${season}`
      };
    }
    
    progressCallback?.('🗓️ Processing game schedule...');
    // Create week mapping for easy lookup
    const weekMap: { [gameId: string]: number } = {};
    gameData.forEach((game: any) => {
      weekMap[game.id] = game.week;
    });
    
    // Check if the specified week exists in the game data
    const weekExists = gameData.some((game: any) => game.week === week);
    if (!weekExists) {
      return {
        success: false,
        totalRecords: 0,
        sampleData: null,
        errors: [`No games found for season ${season} week ${week}`],
        message: `No games found for season ${season} week ${week}`
      };
    }
    
    progressCallback?.('📊 Downloading game statistics...');
    // Fetch and decompress all game data for the season
    const fetchedGameData = await fetchAllSeasonGameData(season);
    
    // Validate the fetched data structure
    const validation = validateGameDataStructure(fetchedGameData);
    if (!validation.isValid) {
      return {
        success: false,
        totalRecords: 0,
        sampleData: null,
        errors: validation.errors,
        message: 'Invalid game data structure'
      };
    }
    
    progressCallback?.('👥 Loading player data...');
    // Test player ID mapping from database
    const playerIdMapping = await getTestPlayerIdMapping();
    
    progressCallback?.('⚙️ Processing player statistics...');
    // Create sample data showing what would be processed
    const gamesInWeek = Object.entries(weekMap).filter(([, wk]) => wk === week);
    const boxScoreGames = fetchedGameData.boxData.filter((box: any) => 
      String(box.id) in weekMap && weekMap[String(box.id)] === week
    );

    // Actually process the player stats (without saving) to show what would be created
    let processedStats: any[] = [];
    const statBreakdown = {
      totalPlayers: 0,
      playersWithStats: {
        passing: 0, rushing: 0, receiving: 0, kicking: 0,
        punting: 0, defense: 0, specialTeams: 0, other: 0
      },
      topPerformers: [] as any[]
    };

    if (boxScoreGames.length > 0) {
      try {
        // Import and use the actual processing function
        const { processPlayerStats } = await import('src/lib/process-week');
        
        processedStats = processPlayerStats(
          fetchedGameData.boxData,
          fetchedGameData.playerData,
          weekMap,
          season,
          week,
          playerIdMapping
        );
        
        // Analyze the processed stats
        statBreakdown.totalPlayers = processedStats.length;
        
        processedStats.forEach(player => {
          if (player.passatt > 0) statBreakdown.playersWithStats.passing++;
          if (player.rushatt > 0) statBreakdown.playersWithStats.rushing++;
          if (player.recrec > 0) statBreakdown.playersWithStats.receiving++;
          if (player.kxpa > 0 || player.kfga50 > 0) statBreakdown.playersWithStats.kicking++;
          if (player.ppunts > 0) statBreakdown.playersWithStats.punting++;
          if (player.deftck > 0) statBreakdown.playersWithStats.defense++;
          if (player.stkr > 0 || player.stpr > 0) statBreakdown.playersWithStats.specialTeams++;
          if (player.otherpancakes > 0) statBreakdown.playersWithStats.other++;
        });
        
        // Get top performers for preview
        statBreakdown.topPerformers = processedStats
          .filter(p => (p.passyds + p.rushyds + p.recyds + p.deftck) > 0)
          .sort((a, b) => (b.passyds + b.rushyds + b.recyds) - (a.passyds + a.rushyds + a.recyds))
          .slice(0, 5)
          .map(p => ({
            pid: p.pid,
            team: p.team,
            stats: [
              p.passyds > 0 ? `${p.passcmp}/${p.passatt}, ${p.passyds} pass yds, ${p.passtd} TD` : null,
              p.rushyds > 0 ? `${p.rushatt} car, ${p.rushyds} rush yds, ${p.rushtd} TD` : null,
              p.recyds > 0 ? `${p.recrec} rec, ${p.recyds} rec yds, ${p.rectd} TD` : null,
              p.deftck > 0 ? `${p.deftck} tck, ${p.defsack} sack, ${p.defint} int` : null
            ].filter(Boolean).join(' | ')
          }));
      } catch (procError) {
        logger.error('Error processing stats in test:', procError);
      }
    }

    const sampleData = {
      season,
      week,
      gameData: {
        totalGames: gameData.length,
        gamesInWeek: gamesInWeek.length,
        gameIds: gamesInWeek.map(([id]) => id)
      },
      fetchedData: {
        boxScoreRecords: fetchedGameData.boxData.length,
        playerRecords: fetchedGameData.playerData.length,
        gamesInTargetWeek: boxScoreGames.length
      },
      playerIdMapping: {
        totalMappings: Object.keys(playerIdMapping).length,
        sampleMappings: Object.entries(playerIdMapping).slice(0, 3)
      },
      processedStats: statBreakdown,
      sampleBoxScore: boxScoreGames[0] ? {
        gameId: boxScoreGames[0].id,
        homeTeam: boxScoreGames[0].hAbb,
        awayTeam: boxScoreGames[0].aAbb,
        statCategories: ['Passing', 'Rushing', 'Receiving', 'Kicking', 'Punting', 'Def', 'ST', 'Other'].filter(cat => 
          boxScoreGames[0][`hStats${cat}`]?.length > 0 || boxScoreGames[0][`aStats${cat}`]?.length > 0
        )
      } : null
    };

    return {
      success: true,
      totalRecords: boxScoreGames.length,
      sampleData,
      errors: [],
      message: `Successfully analyzed data for season ${season} week ${week} (DRY RUN - no database changes)`
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      totalRecords: 0,
      sampleData: null,
      errors: [errorMessage],
      message: `Error analyzing season ${season} week ${week}: ${errorMessage}`
    };
  }
};

// Test player ID mapping fetch using PortalClient
const getTestPlayerIdMapping = async (): Promise<{ [simId: number]: number }> => {
  try {
    const players = await PortalClient.getPlayers();
    const mapping: { [simId: number]: number } = {};
    
    players.forEach(player => {
      if (player.simId && player.pid) {
        mapping[player.simId] = player.pid;
      }
    });
    
    logger.info(`Test: Found ${Object.keys(mapping).length} player ID mappings from PortalClient`);
    return mapping;
  } catch (error) {
    logger.error('Error in getTestPlayerIdMapping from PortalClient:', error);
    return {};
  }
};

// Function to test milestone posting with actual webhook call to verify functionality
const testMilestonesToWebhooks = async (milestones: MilestoneAchievement[], season: number, week: number): Promise<string[]> => {
  if (milestones.length === 0) return ['No milestones to test'];

  const results: string[] = [];
  
  // Group milestones by team using the team field from milestone data
  const milestonesByTeam: Record<string, MilestoneAchievement[]> = {};
  
  for (const milestone of milestones) {
    const teamKey = milestone.team || 'unknown';
    
    if (!milestonesByTeam[teamKey]) {
      milestonesByTeam[teamKey] = [];
    }
    milestonesByTeam[teamKey].push(milestone);
  }

  // Find the first team with milestones and post to their webhook for testing
  for (const [teamAbbr, teamConfig] of Object.entries(TeamConfig.guildTeamMap)) {
    const teamMilestones = milestonesByTeam[teamAbbr.toLowerCase()] || milestonesByTeam[teamAbbr.toUpperCase()] || [];
    
    if (teamMilestones.length === 0) continue;

    const milestoneMessage = await UnifiedMilestoneChecker.formatMilestoneMessage(teamMilestones);
    const fullContent = `🧪 **TEST: S${season} W${week} Milestones - ${teamAbbr.toUpperCase()}**\n\n${milestoneMessage}`;

    // Check message length (Discord limit is 2000 characters)
    const contentToSend = fullContent.length > 1900 ? 
      fullContent.substring(0, 1900) + '\n\n*[Message truncated for testing]*' : 
      fullContent;

    // Actually post to the webhook for testing
    try {
      const webhookPayload = {
        content: contentToSend,
        username: 'Kaiju Keeper (TEST)',
        avatar_url: 'https://media.discordapp.net/attachments/1121495689608822806/1384689434833846293/lemonoppy_emote.png?ex=68c561c7&is=68c41047&hm=a32bc96d7adec1a62784af1e02d901821cabe79dd5ffed6168868b585a924609&=&format=webp&quality=lossless&width=970&height=1024'
      };

      const response = await fetch(teamConfig.webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        results.push(`❌ Failed to post to ${teamAbbr} webhook: ${response.status} ${response.statusText}`);
        results.push(`📝 Error details: ${errorText.substring(0, 200)}`);
        results.push(`📏 Message length: ${contentToSend.length} characters`);
      } else {
        results.push(`✅ Successfully posted ${teamMilestones.length} milestones to ${teamAbbr} webhook`);
        results.push(`🔗 Webhook URL: ${teamConfig.webhook.substring(0, 50)}...`);
        results.push(`📏 Message length: ${contentToSend.length} characters`);
      }
      
      // Only test one webhook to avoid spam
      break;
      
    } catch (error) {
      results.push(`❌ Error posting to ${teamAbbr} webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
      break;
    }
  }

  // If no milestones were found for any team, show summary
  if (results.length === 0) {
    results.push('No milestones found for any configured teams');
  }

  return results;
};

const command: SlashCommand = {
  command: new SlashCommandBuilder()
    .setName('test-scrape-stats')
    .setDescription('Test scrape game statistics WITHOUT saving to database (dry run)')
    .addIntegerOption(option =>
      option
        .setName('season')
        .setDescription('Season number to test')
        .setRequired(true)
        .setMinValue(27)
    )
    .addIntegerOption(option =>
      option
        .setName('week')
        .setDescription('Week to test')
        .setMinValue(1)
        .setMaxValue(19)
        .setRequired(true)
    ),
  minRole: UserRole.SERVER_ADMIN,
  execute: async (interaction) => {
    const season = interaction.options.getInteger('season', true);
    const week = interaction.options.getInteger('week', true);

    await interaction.deferReply();

    try {
      logger.info(`TEST: Analyzing Season ${season}, Week ${week} with unified system (DRY RUN)`);
      
      // Add a timeout to prevent Discord interaction expiration
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Test analysis timed out after 10 minutes')), 10 * 60 * 1000);
      });
      
      // Create progress callback to update Discord
      let lastProgressUpdate = Date.now();
      const progressCallback = async (message: string) => {
        const now = Date.now();
        if (now - lastProgressUpdate > 5000) { // Update every 5 seconds max
          try {
            await interaction.editReply(`🧪 **TEST PROGRESS:** ${message}`);
            lastProgressUpdate = now;
          } catch (error) {
            // Ignore Discord errors during progress updates
            logger.warn('Failed to update progress:', error);
          }
        }
      };
      
      const result = await Promise.race([
        testProcessWeekUnified(season, week, progressCallback),
        timeoutPromise
      ]) as any;
      
      if (!result.success) {
        const errorMessage = `❌ **TEST ERROR:** ${result.message}`;
        const errorDetails = result.errors.length > 0 ? `\n\`\`\`${result.errors.join('\n').substring(0, 1500)}\`\`\`` : '';
        await interaction.editReply(errorMessage + errorDetails);
        return;
      }

      const resultMessage = [
        `🧪 **TEST: S${season} W${week} - Unified Processing Analysis (DRY RUN)**`,
        `📊 **Games found:** ${result.sampleData.gameData.gamesInWeek}`,
        `🎯 **Box score records:** ${result.sampleData.fetchedData.boxScoreRecords}`,
        `👥 **Player records:** ${result.sampleData.fetchedData.playerRecords}`,
        `🔗 **Player ID mappings:** ${result.sampleData.playerIdMapping.totalMappings}`,
        `🚫 **Database:** NO CHANGES MADE - This is a test run`,
        ''
      ];

      if (result.sampleData.sampleBoxScore) {
        resultMessage.push(
          `**Sample Game:** ${result.sampleData.sampleBoxScore.gameId} (${result.sampleData.sampleBoxScore.awayTeam} @ ${result.sampleData.sampleBoxScore.homeTeam})`,
          `**Stat Categories:** ${result.sampleData.sampleBoxScore.statCategories.join(', ')}`,
          ''
        );
      }

      // Show processed statistics details
      if (result.sampleData.processedStats) {
        const stats = result.sampleData.processedStats;
        resultMessage.push(
          `🎮 **PROCESSED STATISTICS (What would be saved):**`,
          `📈 **Total player stat records:** ${stats.totalPlayers}`,
          `🏈 **Players with stats:** Pass: ${stats.playersWithStats.passing}, Rush: ${stats.playersWithStats.rushing}, Rec: ${stats.playersWithStats.receiving}`,
          `🛡️ **Defense/Special Teams:** Def: ${stats.playersWithStats.defense}, K: ${stats.playersWithStats.kicking}, P: ${stats.playersWithStats.punting}`,
          ''
        );

        if (stats.topPerformers.length > 0) {
          resultMessage.push(`**🌟 Top Performers Preview:**`);
          stats.topPerformers.forEach((player: any, i: number) => {
            resultMessage.push(`${i + 1}. **PID ${player.pid}** (${player.team}): ${player.stats}`);
          });
          resultMessage.push('');
        }
      }

      // Test milestones checking without saving
      try {
        logger.info(`TEST: Checking milestones for Season ${season}, Week ${week}`);
        
        // Note: This will check milestones based on existing database data
        const milestoneAchievements = await UnifiedMilestoneChecker.checkAllMilestones(season, week);
        
        if (milestoneAchievements.length > 0) {
          resultMessage.push(`🏆 **Milestones (existing data):** ${milestoneAchievements.length} achievements found`);
          
          // Test webhook posting
          const webhookResults = await testMilestonesToWebhooks(milestoneAchievements, season, week);
          resultMessage.push('', '**Webhook Test Results:**');
          resultMessage.push(...webhookResults.slice(0, 3)); // Limit output
          
          if (webhookResults.length > 3) {
            resultMessage.push(`... and ${webhookResults.length - 3} more webhook tests`);
          }
        } else {
          resultMessage.push(`🏆 **Milestones:** No milestones found for this week`);
        }
      } catch (error) {
        logger.error('Error testing milestones:', error);
        resultMessage.push('', '⚠️ *Could not test milestones due to an error*');
      }

      const finalMessage = resultMessage.join('\n');
      
      // Discord messages have a 2000 character limit
      if (finalMessage.length > 1900) {
        await interaction.editReply(finalMessage.substring(0, 1900) + '\n\n*[Message truncated]*');
      } else {
        await interaction.editReply(finalMessage);
      }

    } catch (error) {
      logger.error('TEST: Unified scraping test failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Handle specific error types
      if (errorMessage.includes('timed out')) {
        await interaction.editReply(`⏰ **TEST TIMEOUT:** Analysis took too long (>10 minutes)\n\`\`\`The test process was cancelled to prevent Discord interaction expiration. This usually means the data fetching is taking longer than expected.\`\`\``);
      } else if (errorMessage.includes('Unknown Message')) {
        await interaction.editReply(`🔄 **SESSION EXPIRED:** Discord interaction timed out\n\`\`\`Please try running the test command again. The analysis may have taken longer than Discord's 15-minute limit.\`\`\``);
      } else {
        const truncatedError = errorMessage.length > 1500 ? errorMessage.substring(0, 1500) + '...' : errorMessage;
        await interaction.editReply(`❌ **TEST ERROR:** Failed to test S${season} W${week}\n\`\`\`${truncatedError}\`\`\``);
      }
    }
  },
  
  cooldown: 5 // Lower cooldown for testing
};

export default command;