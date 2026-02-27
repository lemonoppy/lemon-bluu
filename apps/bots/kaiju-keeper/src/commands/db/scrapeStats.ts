import { SlashCommandBuilder } from 'discord.js';
import { TeamConfig, UserRole } from 'src/lib/config/config';
import { logger } from 'src/lib/logger';
import { UnifiedMilestoneChecker } from 'src/lib/milestones-unified';
import { MilestoneAchievement } from 'src/lib/milestones-unified';
import { processWeekUnified } from 'src/lib/process-week';
import { SlashCommand } from 'typings/command';

// Function to post milestones to team webhooks
const postMilestonesToWebhooks = async (milestones: MilestoneAchievement[], season: number, week: number): Promise<void> => {
  if (milestones.length === 0) return;

  // Group milestones by team using the team field from milestone data
  const milestonesByTeam: Record<string, MilestoneAchievement[]> = {};
  
  for (const milestone of milestones) {
    const teamKey = milestone.team || 'unknown';
    
    if (!milestonesByTeam[teamKey]) {
      milestonesByTeam[teamKey] = [];
    }
    milestonesByTeam[teamKey].push(milestone);
  }

  // Post to each team's webhook using new structure
  for (const [teamAbbr, teamConfig] of Object.entries(TeamConfig.guildTeamMap)) {
    const teamMilestones = milestonesByTeam[teamAbbr.toLowerCase()] || milestonesByTeam[teamAbbr.toUpperCase()] || [];
    
    if (teamMilestones.length === 0) continue;

    try {
      const milestoneMessage = await UnifiedMilestoneChecker.formatMilestoneMessage(teamMilestones);
      const fullContent = `🎉 **S${season} W${week} Milestones** 🎉\n\n${milestoneMessage}`;

      // Check message length (Discord limit is 2000 characters)
      const contentToSend = fullContent.length > 1900 ? 
        fullContent.substring(0, 1900) + '\n\n*[Message truncated]*' : 
        fullContent;
      
      const webhookPayload = {
        content: contentToSend,
        username: 'Kaiju Keeper',
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
        logger.error(`Failed to post to webhook for ${teamAbbr}: ${response.status} ${response.statusText}`);
        logger.error(`Error details: ${errorText.substring(0, 200)}`);
        logger.error(`Message length: ${contentToSend.length} characters`);
      } else {
        logger.info(`Successfully posted ${teamMilestones.length} milestones to ${teamAbbr} webhook`);
        logger.info(`Message length: ${contentToSend.length} characters`);
      }
    } catch (error) {
      logger.error(`Error posting to webhook for ${teamAbbr}:`, error);
    }
  }
};

const command: SlashCommand = {
  command: new SlashCommandBuilder()
    .setName('scrape-stats')
    .setDescription('Scrape game statistics and save to unified player_stats table')
    .addIntegerOption(option =>
      option
        .setName('season')
        .setDescription('Season number to scrape')
        .setRequired(true)
        .setMinValue(27)
    )
    .addIntegerOption(option =>
      option
        .setName('week')
        .setDescription('Week to scrape')
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
      logger.info(`Processing Season ${season}, Week ${week} with unified system`);
      
      const result = await processWeekUnified(season, week);
      
      if (!result.success) {
        await interaction.editReply(`❌ **Error:** ${result.message}\n\`\`\`${result.errors.join('\n')}\`\`\``);
        return;
      }

      const resultMessage = [
        `✅ **S${season} W${week} - Unified Processing Complete**`,
        `📊 **Records Processed:** ${result.totalRecords}`,
        `💾 **Saved to player_stats:** ${result.insertedCount}`
      ];

      if (result.errorCount > 0) {
        resultMessage.push(`⚠️ **Errors:** ${result.errorCount} failed insertions`);
      }

      // Check for milestones and post to team webhooks
      try {
        logger.info(`Checking milestones for Season ${season}, Week ${week}`);
        const milestoneAchievements = await UnifiedMilestoneChecker.checkAllMilestones(season, week);
        
        if (milestoneAchievements.length > 0) {
          resultMessage.push(`🏆 **Milestones:** ${milestoneAchievements.length} achievements found - posting to team webhooks`);
          logger.info(`Found ${milestoneAchievements.length} milestone achievements`);
          
          // Post milestones to team webhooks
          await postMilestonesToWebhooks(milestoneAchievements, season, week);
        } else {
          resultMessage.push(`🏆 **Milestones:** No new milestones this week`);
        }
      } catch (error) {
        logger.error('Error checking milestones:', error);
        resultMessage.push('\n\n⚠️ *Could not check milestones due to an error*');
      }

      await interaction.editReply(resultMessage.join(`\n`));

    } catch (error) {
      logger.error('Unified scraping failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      await interaction.editReply(`❌ **Error:** Failed to process S${season} W${week}\n\`\`\`${errorMessage}\`\`\``);
    }
  },
  
  cooldown: 10 // Reduced cooldown for unified processing
};

export default command;