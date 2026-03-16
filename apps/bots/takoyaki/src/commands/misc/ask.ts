import { GoogleGenAI } from "@google/genai";
import { SlashCommandBuilder } from 'discord.js';

import _ from 'lodash';
import { StatsClient } from 'src/db/stats/StatsClient';
import { SlashCommand } from 'typings/command';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default {
  command: new SlashCommandBuilder()
    .setName('ask')
    .addStringOption((option) =>
      option
        .setName('question')
        .setDescription(
          'Ask a question to Takoyaki',
        )
        .setRequired(true),
    )
    .setDescription('What does Takoyaki think?'),
  execute: async (interaction) => {
    try {
      await interaction.deferReply();

      const question = interaction.options.getString('question') ?? '';
      const happiness = _.clamp(Math.random() * 20 + Math.random() * 20, 0, 30);
      const tone = happiness < 10 ? 'blunt and critical'
        : happiness < 20 ? 'confident and direct'
        : 'enthusiastic and bold';

      const leaderContext = StatsClient.getLeaderContext();
      const standingsContext = StatsClient.getStandingsContext();
      const teamHistoryContext = StatsClient.getTeamHistoryContext();
      const gmHistoryContext = StatsClient.getGMHistoryContext();
      const awardsContext = StatsClient.getAwardsContext();
      const playerContext = StatsClient.findPlayerInText(question);

      const contextParts = [
        leaderContext,
        standingsContext,
        awardsContext,
        teamHistoryContext,
        gmHistoryContext,
        playerContext ? `Mentioned player:\n${playerContext}` : '',
      ].filter(Boolean);

      const statsSection = contextParts.length
        ? `\n\n[CONTEXT]\n${contextParts.join('\n\n')}`
        : '';

      const persona = [
        '[PERSONA & RULES]',
        'You are Takoyaki, an outspoken analyst and die-hard fan of the International Sim Football League (ISFL).',
        'Always take a clear stance — commit to an opinion, pick a side, and say it directly. Do not hedge, equivocate, or give non-answers.',
        'Keep responses to roughly 3-5 sentences unless the question clearly warrants more detail.',
        `Be ${tone} in your tone.`,
        'Use 1-2 emojis per response.',
        'Introduce yourself briefly only if this seems like a first-time interaction or the user directly asks who you are.',
        'Do not invent player stats, game results, or standings. If the information is not in the provided context, say you do not have that data.',
        '',
        'League structure:',
        'The ISFL has a sister league, the Developmental Sim Football League (DSFL).',
        'ISFL conferences — ASFC: Orange County Otters, New Orleans Secondline, Honolulu Hahalua, San Jose Sabercats, Austin Copperheads, Arizona Outlaws, New York Silverback.',
        'NSFC: Baltimore Hawks, Cape Town Crash, Black Forest Brood, Osaka Kaiju, Sarasota Sailfish, Colorado Yeti, Yellowknife Wraiths.',
        'DSFL North: Minnesota Grey Ducks, Portland Pythons, London Royals, Kansas City Coyotes.',
        'DSFL South: Tijuana Luchadores, Norfolk Seawolves, Bondi Beach Buccaneers, Dallas Birddogs.',
        'ISFL regular season = 16 games. DSFL regular season = 14 games.',
        'When discussing awards like All-Pro or Pro Bowl, only compare players to others at the same position.',
        'Hall of Fame caliber requires multiple First Team All-Pro selections, at least a couple Second Team All-Pro selections, and many Pro Bowl appearances — though 4 or more First Team All-Pros is enough on its own to waive the Second Team requirement. A single great season or a handful of Pro Bowls alone does not make someone a Hall of Famer.',
        'When evaluating GMs, consider both their overall win-loss record and championship count — a GM with a strong winning percentage across many seasons is impressive even without a title, and championships alone without context can be misleading, although championships are greatly important.',
        'If a player\'s stats show 16 GP (ISFL) or 14 GP (DSFL), their regular season is complete — do not speculate about them finishing the season strong or playing future regular season games.',
        'You are also a huge fan of the running back Kim Minjeong but will bring it up very seldomly and usually only when asked.',
        statsSection,
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: question,
        config: {
          systemInstruction: persona,
        },
      });
      const responseText = response.text;

      if (typeof responseText !== 'string') {
        await interaction.editReply({ content: "There was an error generating a response. Please try again later." });
        return;
      }

      await interaction.editReply({
        content: `\`\`\`Question: ${question}\`\`\`\n${responseText}`,
      });
    } catch (error: any) {
      const reply = interaction.deferred
        ? (content: string) => interaction.editReply({ content })
        : (content: string) => interaction.reply({ content });

      if (error?.status === 503 || error?.message?.includes('overloaded') || error?.message?.includes('UNAVAILABLE')) {
        await reply("🤖 Takoyaki's brain is a bit overloaded right now! Please try asking again in a few moments.");
        return;
      }

      if (error?.status === 429 || error?.message?.includes('RESOURCE_EXHAUSTED') || error?.message?.includes('quota')) {
        await reply("Sorry, I'm going out for milk. Please try again later when I get back.");
        return;
      }

      if (error?.status >= 400 && error?.status < 500) {
        await reply("There was an issue with your request. Please try rephrasing your question.");
        return;
      }

      await reply("Takoyaki encountered an unexpected error. Please try again later.");
      throw error;
    }
  },
} satisfies SlashCommand;
