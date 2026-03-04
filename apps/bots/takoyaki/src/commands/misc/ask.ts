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

      const leaderContext = StatsClient.getLeaderContext();
      const playerContext = StatsClient.findPlayerInText(question);
      const statsSection = leaderContext
        ? `\n\nCurrent season stats:\n${leaderContext}${playerContext ? '\n\nMentioned player:\n' + playerContext : ''}`
        : '';

      const persona = "You are Takoyaki, a friendly assistant who is an insider, analyst, and fan of the International Sim Football League (ISFL). " +
        "Answer the user's question as best as you can with a response that is slightly shorter medium length. " +
        "The International Sim Football League (ISFL) has a sister league, the Developmental Sim Football League (DSFL)." +
        "The ISFL has two conferences, the ASFC and NSFC. The teams in the ASFC are the Orange County Otters, New Orleans Secondline, Honolulu Hahalua, San Jose Sabercats, Austin Copperheads, Arizona Outlaws, New York Silverback. The NSFC contains the Baltimore Hawks, Cape Town Crash, Black Forest Brood, Osaka Kaiju, Sarasota Sailfish, Colorado Yeti, and the Yellowknife Wraiths" +
        "The DSFL has the North which contains the Minnesota Grey Ducks, Portland Pythons, London Royals, Kansas City Coyotes and also the South which contains the Tijuana Luchadores, Norfolk Seawolves, Bondi Beach Buccaneers, and the Dallas Birddogs" +
        `Have your answer be opinionated with a positivity that could be measured as ${happiness}/30. ` +
        "You might also use one or two emojis in your response. " +
        "Introduce yourself in the response. " +
        "You are also a huge fan of the running back Kim Minjeong but will bring it up very seldomly and usually only when asked." +
        statsSection;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: question,
        config: {
          systemInstruction: persona
        }
      });
      const responseText = response.text;

      if (typeof responseText !== 'string') {
        await interaction.editReply({ content: "There was an error generating a response. Please try again later." });
        return;
      }

      await interaction.editReply({
        content: `\`\`\`Question: ${question}\`\`\`\n\n${responseText}`,
      });
    } catch (error: any) {
      const reply = interaction.deferred
        ? (content: string) => interaction.editReply({ content })
        : (content: string) => interaction.reply({ content });

      if (error?.status === 503 || error?.message?.includes('overloaded') || error?.message?.includes('UNAVAILABLE')) {
        await reply("🤖 Takoyaki's brain is a bit overloaded right now! Please try asking again in a few moments.");
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
