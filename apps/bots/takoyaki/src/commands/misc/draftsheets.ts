import { SlashCommandBuilder } from 'discord.js';

import { SlashCommand } from 'typings/command';

export default {
  command: new SlashCommandBuilder()
    .setName('draftsheets')
    .setDescription('Get a link to the draft/mock sheets'),
  execute: async (interaction) => {
    const mockSheet = 'https://docs.google.com/spreadsheets/d/1q9afFWRQm8faDpi5johqe9FaulITBqDcjATF1yVb0Y8/edit?usp=sharing'
    const isflBoard = 'https://docs.google.com/spreadsheets/d/1N6-r6WyKWrQ5bY5opNAC9m0gToU2oll29RUNmtujRMg/edit?usp=sharing'
    const dsflBoard = 'https://docs.google.com/spreadsheets/d/1IcZ_qLJTsHpwZaLUUSrXSabMsBJlN0f3y-TEIJn0JTc/edit?usp=sharing'

    await interaction.reply({
      content: `Here are the links to the draft sheets, make a copy and post some mocks!\n\n**Mock Draft Sheet:** ${mockSheet}\n**ISFL Draft Board:** ${isflBoard}\n**DSFL Draft Board:** ${dsflBoard}`,
    });
    return;
  },
} satisfies SlashCommand;
